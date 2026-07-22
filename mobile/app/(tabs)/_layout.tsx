import { Tabs } from 'expo-router';
import { StyleSheet, Text, type ColorValue } from 'react-native';

import { colors, fonts } from '@/lib/theme';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.inkFaint,
        tabBarStyle: styles.tabBar,
        tabBarLabelStyle: styles.label,
        tabBarItemStyle: styles.item,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color }) => <TabIcon color={color} icon="⌂" />,
        }}
      />
      <Tabs.Screen
        name="calendar"
        options={{
          title: 'Calendar',
          tabBarIcon: ({ color }) => <TabIcon color={color} icon="□" />,
        }}
      />
      <Tabs.Screen
        name="progress"
        options={{
          title: 'Progress',
          tabBarIcon: ({ color }) => <TabIcon color={color} icon="▥" />,
        }}
      />
      <Tabs.Screen
        name="more"
        options={{
          title: 'More',
          tabBarIcon: ({ color }) => <TabIcon color={color} icon="•••" />,
        }}
      />
      <Tabs.Screen
        name="admin"
        options={{
          title: 'Admin',
          tabBarIcon: ({ color }) => <TabIcon color={color} icon="⚙" />,
        }}
      />
    </Tabs>
  );
}

function TabIcon({ color, icon }: { color: ColorValue; icon: string }) {
  return <Text style={[styles.icon, { color }]}>{icon}</Text>;
}

const styles = StyleSheet.create({
  tabBar: {
    height: 72,
    paddingTop: 8,
    paddingBottom: 12,
    backgroundColor: colors.darkBox,
    borderTopColor: colors.line,
    borderTopWidth: 1,
  },
  item: {
    borderRadius: 10,
  },
  label: {
    fontFamily: fonts.monoBold,
    fontSize: 10,
    letterSpacing: 0.2,
  },
  icon: {
    fontFamily: fonts.sansSemi,
    fontSize: 22,
    lineHeight: 24,
  },
});
