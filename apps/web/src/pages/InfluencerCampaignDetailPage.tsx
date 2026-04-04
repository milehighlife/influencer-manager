import { useMemo } from "react";
import { Link, useParams } from "react-router-dom";
import type {
  PlanningViewAction,
  PlanningViewMission,
} from "@influencer-manager/shared/types/mobile";

import { EmptyState } from "../components/EmptyState";
import { ErrorState } from "../components/ErrorState";
import { PageSection } from "../components/PageSection";
import { StatusBadge } from "../components/StatusBadge";
import { useCampaignPlanningViewQuery } from "../hooks/use-campaign-builder";
import { useCampaignInfluencerRatings } from "../hooks/use-influencer-manager";
import { formatDate, formatPlatform } from "../utils/format";

function statusTone(status: string): "info" | "success" | "warning" | "danger" {
  if (status === "active") return "success";
  if (status === "completed") return "info";
  if (status === "archived") return "warning";
  if (status === "paused" || status === "draft") return "danger";
  return "info";
}

interface MissionWithFilteredActions {
  mission: PlanningViewMission;
  actions: PlanningViewAction[];
}

export function InfluencerCampaignDetailPage({
  canPlan,
}: {
  canPlan: boolean;
}) {
  const { influencerId, campaignId } = useParams<{
    influencerId: string;
    campaignId: string;
  }>();

  const campaignQuery = useCampaignPlanningViewQuery(campaignId);
  const campaign = campaignQuery.data ?? null;
  const { ratingsByAssignment } = useCampaignInfluencerRatings(
    campaignId,
    influencerId,
  );

  const filteredMissions = useMemo(() => {
    if (!campaign || !influencerId) return [];

    const result: MissionWithFilteredActions[] = [];

    for (const mission of campaign.missions) {
      const actionsForInfluencer = mission.actions.filter((action) =>
        action.assignments.some(
          (assignment) => assignment.influencer_id === influencerId,
        ),
      );

      if (actionsForInfluencer.length > 0) {
        result.push({ mission, actions: actionsForInfluencer });
      }
    }

    return result;
  }, [campaign, influencerId]);

  if (campaignQuery.isLoading) {
    return (
      <p className="muted" style={{ padding: 32 }}>
        Loading campaign...
      </p>
    );
  }

  if (campaignQuery.isError || !campaign) {
    return (
      <div style={{ padding: 32 }}>
        <ErrorState
          message="Campaign could not be loaded."
          onRetry={() => {
            void campaignQuery.refetch();
          }}
        />
      </div>
    );
  }

  return (
    <div className="page-stack">
      <PageSection
        eyebrow="Campaign"
        title={campaign.name}
        actions={
          <Link
            className="secondary-button"
            to={`/influencers/${influencerId}`}
          >
            Back to influencer
          </Link>
        }
      >
        <div className="detail-fields">
          <div className="detail-field">
            <span className="detail-label">Company</span>
            <span>
              <strong>{campaign.company.name}</strong>
            </span>
          </div>
          <div className="detail-field">
            <span className="detail-label">Status</span>
            <StatusBadge
              label={campaign.status}
              tone={statusTone(campaign.status)}
            />
          </div>
          {campaign.campaign_type ? (
            <div className="detail-field">
              <span className="detail-label">Type</span>
              <span>
                <strong>{campaign.campaign_type}</strong>
              </span>
            </div>
          ) : null}
          <div className="detail-field">
            <span className="detail-label">Dates</span>
            <span>
              <strong>
                {formatDate(campaign.start_date)} –{" "}
                {formatDate(campaign.end_date)}
              </strong>
            </span>
          </div>
          {campaign.description ? (
            <div className="detail-field">
              <span className="detail-label">Description</span>
              <span>{campaign.description}</span>
            </div>
          ) : null}
        </div>
      </PageSection>

      <PageSection eyebrow="Participation" title="Missions & Actions">
        {filteredMissions.length === 0 ? (
          <EmptyState
            title="No missions"
            message="This influencer has no assigned actions in this campaign."
          />
        ) : (
          <div className="page-stack">
            {filteredMissions.map(({ mission, actions }) => (
              <div key={mission.id} className="mission-group">
                <div className="mission-header">
                  <h3 style={{ margin: 0 }}>{mission.name}</h3>
                  <StatusBadge
                    label={mission.status}
                    tone={statusTone(mission.status)}
                  />
                </div>
                {mission.start_date || mission.end_date ? (
                  <p className="muted" style={{ margin: "4px 0 0" }}>
                    {formatDate(mission.start_date)} –{" "}
                    {formatDate(mission.end_date)}
                  </p>
                ) : null}

                <table className="data-table" style={{ marginTop: 12 }}>
                  <thead>
                    <tr>
                      <th>Action</th>
                      <th>Platform</th>
                      <th>Format</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {actions.map((action) => {
                      const assignment = action.assignments.find(
                        (a) => a.influencer_id === influencerId,
                      );
                      const isPublished =
                        assignment?.assignment_status === "approved" ||
                        assignment?.assignment_status === "completed";
                      const rating = assignment
                        ? ratingsByAssignment.get(assignment.id)
                        : undefined;
                      const hasRating =
                        rating != null &&
                        rating.visual_quality_score != null &&
                        rating.script_quality_score != null &&
                        rating.overall_quality_score != null;
                      const showRating = isPublished && hasRating;

                      return (
                        <tr
                          key={action.id}
                          className={showRating ? "row-rated" : undefined}
                        >
                          <td>{action.title}</td>
                          <td>{formatPlatform(action.platform)}</td>
                          <td>
                            {action.content_format
                              ? formatPlatform(action.content_format)
                              : "—"}
                          </td>
                          <td>
                            {showRating ? (
                              <span className="rating-average">
                                {(
                                  (rating.visual_quality_score! +
                                    rating.script_quality_score! +
                                    rating.overall_quality_score!) /
                                  3
                                ).toFixed(1)}{" "}
                                <span className="rating-star-inline">
                                  &#9733;
                                </span>
                              </span>
                            ) : assignment ? (
                              <StatusBadge
                                label={assignment.assignment_status}
                                tone={statusTone(assignment.assignment_status)}
                              />
                            ) : (
                              <StatusBadge
                                label={action.status}
                                tone={statusTone(action.status)}
                              />
                            )}
                          </td>
                          <td>
                            <Link
                              className="secondary-button"
                              to={`/influencers/${influencerId}/campaigns/${campaignId}/actions/${action.id}`}
                            >
                              Edit
                            </Link>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ))}
          </div>
        )}
      </PageSection>
    </div>
  );
}
