import { NavigationContainer, DefaultTheme } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createStackNavigator } from "@react-navigation/stack";
import {
  INFLUENCER_ROLES,
  PLANNING_WRITE_ROLES,
} from "@influencer-manager/shared/types/auth";
import { Text } from "react-native";

import { LoadingState } from "../components/LoadingState";
import {
  useCreatorStatusDigestQuery,
} from "../hooks/use-influencer-workspace-queries";
import { useAssignmentsQuery } from "../hooks/use-mobile-queries";
import { useBootstrapAuth } from "../hooks/use-bootstrap-auth";
import { useAuthStore } from "../state/auth-store";
import { mobileTheme } from "../theme";
import { ActionDetailScreen } from "../screens/ActionDetailScreen";
import { AssignmentDetailScreen } from "../screens/AssignmentDetailScreen";
import { AssignmentQueueScreen } from "../screens/AssignmentQueueScreen";
import { CampaignDetailScreen } from "../screens/CampaignDetailScreen";
import { CampaignListScreen } from "../screens/CampaignListScreen";
import { CampaignReportScreen } from "../screens/CampaignReportScreen";
import { DashboardScreen } from "../screens/DashboardScreen";
import { CreatorStatusScreen } from "../screens/CreatorUpdatesScreen";
import { InfluencerListScreen } from "../screens/InfluencerListScreen";
import { InfluencerAssignmentDetailScreen } from "../screens/InfluencerAssignmentDetailScreen";
import { LoginScreen } from "../screens/LoginScreen";
import { LinkPostScreen } from "../screens/LinkPostScreen";
import { MissionDetailScreen } from "../screens/MissionDetailScreen";
import { MyAssignmentsScreen } from "../screens/MyAssignmentsScreen";
import { MyPostsScreen } from "../screens/MyPostsScreen";
import { PostPerformanceScreen } from "../screens/PostPerformanceScreen";
import { SubmitDeliverableScreen } from "../screens/SubmitDeliverableScreen";
import type {
  AppTabParamList,
  AuthStackParamList,
  InfluencerTabParamList,
  RootStackParamList,
} from "./types";

const AuthStack = createStackNavigator<AuthStackParamList>();
const RootStack = createStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<AppTabParamList>();
const InfluencerTab = createBottomTabNavigator<InfluencerTabParamList>();

const navigationTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: mobileTheme.colors.background,
    card: mobileTheme.colors.surface,
    text: mobileTheme.colors.text,
    border: mobileTheme.colors.border,
    primary: mobileTheme.colors.accent,
  },
};

function AuthNavigator() {
  return (
    <AuthStack.Navigator
      screenOptions={{
        headerShown: false,
      }}
    >
      <AuthStack.Screen name="Login" component={LoginScreen} />
    </AuthStack.Navigator>
  );
}

function TabLabel({
  focused,
  label,
}: {
  focused: boolean;
  label: string;
}) {
  return (
    <Text
      style={{
        color: focused
          ? mobileTheme.colors.accent
          : mobileTheme.colors.textMuted,
        fontSize: 12,
        fontWeight: focused ? "700" : "600",
      }}
    >
      {label}
    </Text>
  );
}

function AppTabsNavigator() {
  const user = useAuthStore((state) => state.user);
  const pendingReviewQuery = useAssignmentsQuery({
    page: 1,
    limit: 1,
    assignment_status: "submitted",
  });
  const canManageWorkflow = user
    ? PLANNING_WRITE_ROLES.includes(
        user.role as (typeof PLANNING_WRITE_ROLES)[number],
      )
    : false;
  const pendingReviewCount = pendingReviewQuery.data?.meta.total ?? 0;

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: mobileTheme.colors.surface,
          borderTopColor: mobileTheme.colors.border,
          height: 68,
          paddingBottom: 10,
          paddingTop: 10,
        },
      }}
    >
      <Tab.Screen
        name="Dashboard"
        component={DashboardScreen}
        options={{
          tabBarBadge:
            canManageWorkflow && pendingReviewCount > 0
              ? pendingReviewCount > 99
                ? "99+"
                : pendingReviewCount
              : undefined,
          tabBarBadgeStyle: {
            backgroundColor: mobileTheme.colors.accent,
            color: mobileTheme.colors.white,
            fontSize: 11,
            fontWeight: "700",
          },
          tabBarLabel: ({ focused }) => (
            <TabLabel focused={focused} label="Dashboard" />
          ),
        }}
      />
      <Tab.Screen
        name="CampaignList"
        component={CampaignListScreen}
        options={{
          title: "Campaigns",
          tabBarLabel: ({ focused }) => (
            <TabLabel focused={focused} label="Campaigns" />
          ),
        }}
      />
      <Tab.Screen
        name="InfluencerList"
        component={InfluencerListScreen}
        options={{
          title: "Influencers",
          tabBarLabel: ({ focused }) => (
            <TabLabel focused={focused} label="Influencers" />
          ),
        }}
      />
    </Tab.Navigator>
  );
}

function InfluencerTabsNavigator() {
  const digestQuery = useCreatorStatusDigestQuery();
  const attentionCount = digestQuery.data?.attention_count ?? 0;

  return (
    <InfluencerTab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: mobileTheme.colors.surface,
          borderTopColor: mobileTheme.colors.border,
          height: 68,
          paddingBottom: 10,
          paddingTop: 10,
        },
      }}
    >
      <InfluencerTab.Screen
        name="CreatorUpdates"
        component={CreatorStatusScreen}
        options={{
          title: "Status",
          tabBarButtonTestID: "creator-tab-status",
          tabBarBadge:
            attentionCount > 0
              ? attentionCount > 99
                ? "99+"
                : attentionCount
              : undefined,
          tabBarBadgeStyle: {
            backgroundColor: mobileTheme.colors.accent,
            color: mobileTheme.colors.white,
            fontSize: 11,
            fontWeight: "700",
          },
          tabBarLabel: ({ focused }) => (
            <TabLabel focused={focused} label="Status" />
          ),
        }}
      />
      <InfluencerTab.Screen
        name="MyAssignments"
        component={MyAssignmentsScreen}
        options={{
          title: "Assignments",
          tabBarButtonTestID: "creator-tab-assignments",
          tabBarLabel: ({ focused }) => (
            <TabLabel focused={focused} label="Assignments" />
          ),
        }}
      />
      <InfluencerTab.Screen
        name="MyPosts"
        component={MyPostsScreen}
        options={{
          title: "Posts",
          tabBarButtonTestID: "creator-tab-posts",
          tabBarLabel: ({ focused }) => (
            <TabLabel focused={focused} label="Posts" />
          ),
        }}
      />
    </InfluencerTab.Navigator>
  );
}

function ManagerRootNavigator() {
  return (
    <RootStack.Navigator
      screenOptions={{
        headerShown: false,
      }}
    >
      <RootStack.Screen name="AppTabs" component={AppTabsNavigator} />
      <RootStack.Screen name="CampaignReport" component={CampaignReportScreen} />
      <RootStack.Screen name="AssignmentQueue" component={AssignmentQueueScreen} />
      <RootStack.Screen name="CampaignDetail" component={CampaignDetailScreen} />
      <RootStack.Screen name="MissionDetail" component={MissionDetailScreen} />
      <RootStack.Screen name="ActionDetail" component={ActionDetailScreen} />
      <RootStack.Screen
        name="AssignmentDetail"
        component={AssignmentDetailScreen}
      />
    </RootStack.Navigator>
  );
}

function InfluencerRootNavigator() {
  return (
    <RootStack.Navigator
      screenOptions={{
        headerShown: false,
      }}
    >
      <RootStack.Screen
        name="InfluencerTabs"
        component={InfluencerTabsNavigator}
      />
      <RootStack.Screen
        name="InfluencerAssignmentDetail"
        component={InfluencerAssignmentDetailScreen}
      />
      <RootStack.Screen
        name="SubmitDeliverable"
        component={SubmitDeliverableScreen}
      />
      <RootStack.Screen name="LinkPost" component={LinkPostScreen} />
      <RootStack.Screen
        name="PostPerformance"
        component={PostPerformanceScreen}
      />
    </RootStack.Navigator>
  );
}

export function AppNavigator() {
  const user = useAuthStore((state) => state.user);
  const { isReady } = useBootstrapAuth();

  if (!isReady) {
    return <LoadingState label="Preparing mobile workspace..." />;
  }

  return (
    <NavigationContainer theme={navigationTheme}>
      {user ? (
        INFLUENCER_ROLES.includes(
          user.role as (typeof INFLUENCER_ROLES)[number],
        ) ? (
          <InfluencerRootNavigator />
        ) : (
          <ManagerRootNavigator />
        )
      ) : (
        <AuthNavigator />
      )}
    </NavigationContainer>
  );
}
