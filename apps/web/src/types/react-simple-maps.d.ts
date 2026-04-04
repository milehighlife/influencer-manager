declare module "react-simple-maps" {
  import type { ComponentType, CSSProperties, ReactNode } from "react";

  interface ComposableMapProps {
    projection?: string;
    projectionConfig?: Record<string, unknown>;
    width?: number;
    height?: number;
    style?: CSSProperties;
    children?: ReactNode;
  }

  interface GeographiesProps {
    geography: string | Record<string, unknown>;
    children: (data: { geographies: GeographyData[] }) => ReactNode;
  }

  interface GeographyData {
    rsmKey: string;
    id: string;
    properties: Record<string, unknown>;
  }

  interface GeographyProps {
    geography: GeographyData;
    key?: string;
    fill?: string;
    stroke?: string;
    strokeWidth?: number;
    onClick?: (e: React.MouseEvent) => void;
    onMouseEnter?: (e: React.MouseEvent) => void;
    onMouseLeave?: (e: React.MouseEvent) => void;
    style?: {
      default?: CSSProperties;
      hover?: CSSProperties;
      pressed?: CSSProperties;
    };
  }

  interface MarkerProps {
    coordinates: [number, number];
    children?: ReactNode;
  }

  interface AnnotationProps {
    subject: [number, number];
    dx: number;
    dy: number;
    connectorProps?: Record<string, unknown>;
    children?: ReactNode;
  }

  export const ComposableMap: ComponentType<ComposableMapProps>;
  export const Geographies: ComponentType<GeographiesProps>;
  export const Geography: ComponentType<GeographyProps>;
  export const Marker: ComponentType<MarkerProps>;
  export const Annotation: ComponentType<AnnotationProps>;
}
