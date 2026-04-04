import { useState, useMemo } from "react";
import { ComposableMap, Geographies, Geography, Marker, Annotation } from "react-simple-maps";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { companiesApi, influencersApi } from "../services/api";

const GEO_URL = "https://cdn.jsdelivr.net/npm/us-atlas@3/states-10m.json";

export type RegionPriority = "none" | "low" | "medium" | "high";

export const PRIORITY_LEVELS: RegionPriority[] = ["none", "low", "medium", "high"];

export const PRIORITY_COLORS: Record<RegionPriority, string> = {
  none: "#FFFFFF",
  low: "#FEF3C7",
  medium: "#FB923C",
  high: "#EF4444",
};

export const PRIORITY_LABELS: Record<RegionPriority, string> = {
  none: "None",
  low: "Low",
  medium: "Medium",
  high: "High",
};

const FIPS_TO_STATE: Record<string, string> = {
  "01": "AL", "02": "AK", "04": "AZ", "05": "AR", "06": "CA",
  "08": "CO", "09": "CT", "10": "DE", "11": "DC", "12": "FL",
  "13": "GA", "15": "HI", "16": "ID", "17": "IL", "18": "IN",
  "19": "IA", "20": "KS", "21": "KY", "22": "LA", "23": "ME",
  "24": "MD", "25": "MA", "26": "MI", "27": "MN", "28": "MS",
  "29": "MO", "30": "MT", "31": "NE", "32": "NV", "33": "NH",
  "34": "NJ", "35": "NM", "36": "NY", "37": "NC", "38": "ND",
  "39": "OH", "40": "OK", "41": "OR", "42": "PA", "44": "RI",
  "45": "SC", "46": "SD", "47": "TN", "48": "TX", "49": "UT",
  "50": "VT", "51": "VA", "53": "WA", "54": "WV", "55": "WI",
  "56": "WY",
};

const STATE_NAMES: Record<string, string> = {
  AL: "Alabama", AK: "Alaska", AZ: "Arizona", AR: "Arkansas", CA: "California",
  CO: "Colorado", CT: "Connecticut", DE: "Delaware", DC: "District of Columbia",
  FL: "Florida", GA: "Georgia", HI: "Hawaii", ID: "Idaho", IL: "Illinois",
  IN: "Indiana", IA: "Iowa", KS: "Kansas", KY: "Kentucky", LA: "Louisiana",
  ME: "Maine", MD: "Maryland", MA: "Massachusetts", MI: "Michigan", MN: "Minnesota",
  MS: "Mississippi", MO: "Missouri", MT: "Montana", NE: "Nebraska", NV: "Nevada",
  NH: "New Hampshire", NJ: "New Jersey", NM: "New Mexico", NY: "New York",
  NC: "North Carolina", ND: "North Dakota", OH: "Ohio", OK: "Oklahoma", OR: "Oregon",
  PA: "Pennsylvania", RI: "Rhode Island", SC: "South Carolina", SD: "South Dakota",
  TN: "Tennessee", TX: "Texas", UT: "Utah", VT: "Vermont", VA: "Virginia",
  WA: "Washington", WV: "West Virginia", WI: "Wisconsin", WY: "Wyoming",
};

// Approximate centroid coordinates for each state
const STATE_CENTERS: Record<string, [number, number]> = {
  AL: [-86.8, 32.8], AK: [-153.5, 64.2], AZ: [-111.7, 34.3], AR: [-92.4, 34.8],
  CA: [-119.5, 37.2], CO: [-105.5, 39.0], CT: [-72.7, 41.6], DE: [-75.5, 39.0],
  DC: [-77.0, 38.9], FL: [-81.7, 28.7], GA: [-83.4, 32.7], HI: [-155.5, 20.0],
  ID: [-114.5, 44.4], IL: [-89.2, 40.0], IN: [-86.3, 39.8], IA: [-93.5, 42.0],
  KS: [-98.3, 38.5], KY: [-85.3, 37.8], LA: [-91.8, 31.0], ME: [-69.2, 45.4],
  MD: [-76.6, 39.0], MA: [-71.8, 42.3], MI: [-84.7, 44.3], MN: [-94.3, 46.3],
  MS: [-89.7, 32.7], MO: [-92.5, 38.4], MT: [-109.6, 47.0], NE: [-99.8, 41.5],
  NV: [-116.6, 39.3], NH: [-71.6, 43.7], NJ: [-74.7, 40.1], NM: [-106.0, 34.4],
  NY: [-75.5, 43.0], NC: [-79.4, 35.6], ND: [-100.5, 47.5], OH: [-82.8, 40.4],
  OK: [-97.5, 35.5], OR: [-120.5, 44.0], PA: [-77.6, 41.0], RI: [-71.5, 41.7],
  SC: [-80.9, 33.9], SD: [-100.2, 44.4], TN: [-86.3, 35.8], TX: [-99.0, 31.5],
  UT: [-111.7, 39.3], VT: [-72.6, 44.1], VA: [-79.4, 37.5], WA: [-120.5, 47.4],
  WV: [-80.6, 38.9], WI: [-89.8, 44.6], WY: [-107.6, 43.0],
};

// Small states that need annotation popouts instead of inline labels
const SMALL_STATES = new Set([
  "CT", "DE", "DC", "MA", "MD", "NH", "NJ", "RI", "VT",
]);

const ANNOTATION_OFFSETS: Record<string, [number, number]> = {
  CT: [35, -10],
  DE: [33, 6],
  DC: [36, 18],
  MA: [40, -6],
  MD: [40, 12],
  NH: [34, -12],
  NJ: [34, 4],
  RI: [30, 4],
  VT: [32, -18],
};

function nextPriority(current: RegionPriority): RegionPriority {
  const idx = PRIORITY_LEVELS.indexOf(current);
  return PRIORITY_LEVELS[(idx + 1) % PRIORITY_LEVELS.length];
}

interface PriorityRegionMapProps {
  companyId: string;
}

export function PriorityRegionMap({ companyId }: PriorityRegionMapProps) {
  const queryClient = useQueryClient();
  const [tooltip, setTooltip] = useState<{ name: string; priority: string; count: number; x: number; y: number } | null>(null);

  const companyQuery = useQuery({
    queryKey: ["web", "companies", companyId],
    queryFn: () => companiesApi.get(companyId),
  });

  const company = companyQuery.data ?? null;
  const clientId = company?.client_id ?? null;
  const regions: Record<string, RegionPriority> = (company?.priority_regions as Record<string, string> ?? {}) as Record<string, RegionPriority>;

  const influencersQuery = useQuery({
    queryKey: ["web", "influencers", "by-client", clientId, "state-counts"],
    queryFn: () => influencersApi.listByClientAndPlatform(clientId!),
    enabled: Boolean(clientId),
  });

  const stateCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const inf of influencersQuery.data ?? []) {
      const st = inf.state?.trim().toUpperCase();
      if (st) {
        counts[st] = (counts[st] ?? 0) + 1;
      }
    }
    return counts;
  }, [influencersQuery.data]);

  const mutation = useMutation({
    mutationFn: (newRegions: Record<string, string>) =>
      companiesApi.update(companyId, { priority_regions: newRegions }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["web", "companies", companyId] });
    },
  });

  function handleClick(stateCode: string) {
    const current = (regions[stateCode] ?? "none") as RegionPriority;
    const next = nextPriority(current);
    const updated = { ...regions };
    if (next === "none") {
      delete updated[stateCode];
    } else {
      updated[stateCode] = next;
    }
    mutation.mutate(updated);
  }

  const counts = useMemo(() => {
    const c = { high: 0, medium: 0, low: 0 };
    for (const v of Object.values(regions)) {
      if (v === "high") c.high++;
      else if (v === "medium") c.medium++;
      else if (v === "low") c.low++;
    }
    return c;
  }, [regions]);

  if (companyQuery.isLoading) {
    return <p className="muted">Loading map...</p>;
  }

  return (
    <div className="priority-map-container">
      <p className="muted" style={{ fontSize: 12, margin: "0 0 4px" }}>Numbers represent influencers in each state. Click a state to set priority.</p>
      <div className="priority-map-wrapper" style={{ position: "relative" }}>
        <ComposableMap
          projection="geoAlbersUsa"
          width={980}
          height={600}
          style={{ width: "100%", height: "auto" }}
        >
          <Geographies geography={GEO_URL}>
            {({ geographies }) =>
              geographies.map((geo) => {
                const fips = geo.id as string;
                const stateCode = FIPS_TO_STATE[fips];
                if (!stateCode) return null;
                const priority = (regions[stateCode] ?? "none") as RegionPriority;
                const fillColor = PRIORITY_COLORS[priority];
                const stateName = STATE_NAMES[stateCode] ?? stateCode;
                const infCount = stateCounts[stateCode] ?? 0;

                return (
                  <Geography
                    key={geo.rsmKey}
                    geography={geo}
                    fill={fillColor}
                    stroke="#94a3b8"
                    strokeWidth={0.5}
                    onClick={() => handleClick(stateCode)}
                    onMouseEnter={(e) => {
                      setTooltip({
                        name: stateName,
                        priority: PRIORITY_LABELS[priority],
                        count: infCount,
                        x: e.clientX,
                        y: e.clientY,
                      });
                    }}
                    onMouseLeave={() => setTooltip(null)}
                    style={{
                      default: { outline: "none" },
                      hover: { outline: "none", stroke: "#4f46e5", strokeWidth: 1.5, cursor: "pointer" },
                      pressed: { outline: "none" },
                    }}
                  />
                );
              })
            }
          </Geographies>

          {/* Inline labels for large states */}
          {Object.entries(STATE_CENTERS).map(([code, coords]) => {
            if (SMALL_STATES.has(code)) return null;
            const infCount = stateCounts[code] ?? 0;
            if (infCount === 0) return null;

            return (
              <Marker key={`label-${code}`} coordinates={coords}>
                <text
                  textAnchor="middle"
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    fill: "#1e293b",
                    pointerEvents: "none",
                  }}
                >
                  {infCount}
                </text>
              </Marker>
            );
          })}

          {/* Annotation popouts for small states */}
          {Object.entries(ANNOTATION_OFFSETS).map(([code, [dx, dy]]) => {
            const coords = STATE_CENTERS[code];
            if (!coords) return null;
            const infCount = stateCounts[code] ?? 0;
            if (infCount === 0) return null;

            return (
              <Annotation
                key={`ann-${code}`}
                subject={coords}
                dx={dx}
                dy={dy}
                connectorProps={{ stroke: "#94a3b8", strokeWidth: 1 }}
              >
                <text
                  textAnchor="start"
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    fill: "#1e293b",
                  }}
                >
                  {code} {infCount}
                </text>
              </Annotation>
            );
          })}
        </ComposableMap>

        {tooltip ? (
          <div
            className="priority-map-tooltip"
            style={{
              position: "fixed",
              left: tooltip.x + 12,
              top: tooltip.y - 10,
            }}
          >
            <strong>{tooltip.name}</strong>
            <br />
            Priority: {tooltip.priority}
            {tooltip.count > 0 ? <><br />Influencers: {tooltip.count}</> : null}
          </div>
        ) : null}
      </div>

      <div className="priority-map-legend">
        {PRIORITY_LEVELS.map((level) => (
          <div key={level} className="priority-legend-item">
            <span
              className="priority-legend-swatch"
              style={{
                background: PRIORITY_COLORS[level],
                border: level === "none" ? "1px solid #cbd5e1" : "none",
              }}
            />
            <span>{PRIORITY_LABELS[level]}</span>
          </div>
        ))}
      </div>

      <p className="muted priority-map-summary">
        High: {counts.high} | Medium: {counts.medium} | Low: {counts.low}
      </p>
    </div>
  );
}
