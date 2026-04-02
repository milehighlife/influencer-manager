import type { NavigatorScreenParams } from "@react-navigation/native";

export type AppTabParamList = {
  Dashboard: undefined;
  CampaignList: undefined;
  InfluencerList: undefined;
};

export type InfluencerTabParamList = {
  CreatorUpdates: undefined;
  MyAssignments: undefined;
  MyPosts: undefined;
};

export type RootStackParamList = {
  AppTabs: NavigatorScreenParams<AppTabParamList>;
  InfluencerTabs: NavigatorScreenParams<InfluencerTabParamList>;
  CampaignReport: {
    campaignId: string;
    campaignName?: string;
  };
  AssignmentQueue: {
    assignmentStatus: "submitted" | "rejected";
    title: string;
    subtitle?: string;
  };
  CampaignDetail: {
    campaignId: string;
    campaignName?: string;
  };
  MissionDetail: {
    missionId: string;
    missionName?: string;
  };
  ActionDetail: {
    actionId: string;
    actionTitle?: string;
  };
  AssignmentDetail: {
    assignmentId: string;
    assignmentTitle?: string;
    influencerName?: string;
  };
  InfluencerAssignmentDetail: {
    assignmentId: string;
    assignmentTitle?: string;
  };
  SubmitDeliverable: {
    assignmentId: string;
    assignmentTitle?: string;
  };
  LinkPost: {
    assignmentId: string;
    assignmentTitle?: string;
    deliverableId?: string;
  };
  PostPerformance: {
    postId: string;
    postUrl?: string;
  };
};

export type AuthStackParamList = {
  Login: undefined;
};
