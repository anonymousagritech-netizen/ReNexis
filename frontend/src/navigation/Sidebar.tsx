import React, { useMemo, useState, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, Image } from 'react-native';
import { colors, radius, spacing, typography, moduleColors } from '@/theme/theme';
import { getVisibleRoutes, RouteKey, RouteDef } from './routes';
import { useAppNavigation } from './NavigationContext';
import { useAuth } from '@/auth/AuthContext';

export function Sidebar() {
  const { user, logout } = useAuth();
  const { current, navigate } = useAppNavigation();
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  const grouped = useMemo(() => {
    if (!user) return [];
    const visible = getVisibleRoutes(user.role);
    const groups = new Map<string, RouteDef[]>();
    for (const r of visible) {
      const arr = groups.get(r.group) || [];
      arr.push(r);
      groups.set(r.group, arr);
    }
    return Array.from(groups.entries());
  }, [user]);

  // Auto-expand whichever group contains the currently active screen.
  useEffect(() => {
    const activeGroup = grouped.find(([, items]) => items.some((i) => i.key === current.route));
    if (activeGroup) {
      setExpandedGroups((prev) => {
        if (prev.has(activeGroup[0])) return prev;
        const next = new Set(prev);
        next.add(activeGroup[0]);
        return next;
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current.route, grouped.length]);

  const toggleGroup = (group: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(group)) next.delete(group);
      else next.add(group);
      return next;
    });
  };

  return (
    <View style={styles.sidebar}>
      <View style={styles.brand}>
        <View style={styles.brandMark}>
          <Image source={require('../../assets/logo-icon.png')} style={styles.brandMarkImage} resizeMode="contain" />
        </View>
        <View>
          <Text style={styles.brandName}>ReNexis</Text>
          <Text style={styles.brandSub}>Reinsurance Platform</Text>
        </View>
      </View>

      <ScrollView style={styles.menu} showsVerticalScrollIndicator={false}>
        {grouped.map(([group, items]) => {
          const groupColor = moduleColors[items[0].colorKey].main;
          const isExpanded = expandedGroups.has(group);
          const hasActiveItem = items.some((i) => i.key === current.route);
          return (
            <View key={group} style={styles.group}>
              <Pressable style={styles.groupHeaderRow} onPress={() => toggleGroup(group)}>
                <View style={[styles.groupDot, { backgroundColor: groupColor }]} />
                <Text style={[styles.groupLabel, hasActiveItem && { color: groupColor }]}>{group}</Text>
                <Text style={styles.chevron}>{isExpanded ? '\u2212' : '+'}</Text>
              </Pressable>
              {isExpanded && (
                <View style={[styles.groupBox, { borderColor: `${groupColor}33` }]}>
                  {items.map((item, idx) => {
                    const active = current.route === item.key;
                    return (
                      <Pressable
                        key={item.key}
                        onPress={() => navigate(item.key as RouteKey)}
                        style={[
                          styles.item,
                          idx !== items.length - 1 && styles.itemDivider,
                          active && { backgroundColor: `${groupColor}22` },
                        ]}
                      >
                        {active && <View style={[styles.activeBar, { backgroundColor: groupColor }]} />}
                        <Text style={[styles.itemIcon, { color: active ? groupColor : colors.textMuted }]}>{item.icon}</Text>
                        <Text style={[styles.itemLabel, active && { color: colors.textPrimary, fontWeight: '700' }]}>{item.label}</Text>
                      </Pressable>
                    );
                  })}
                </View>
              )}
            </View>
          );
        })}
      </ScrollView>

      <View style={styles.footer}>
        <View style={styles.userRow}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {user?.firstName?.[0]}
              {user?.lastName?.[0]}
            </Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.userName} numberOfLines={1}>
              {user?.firstName} {user?.lastName}
            </Text>
            <Text style={styles.userRole}>{user?.role.replace(/_/g, ' ')}</Text>
          </View>
        </View>
        <Pressable onPress={logout} style={styles.logoutBtn}>
          <Text style={styles.logoutText}>Sign out</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  sidebar: {
    width: 260,
    backgroundColor: colors.bgElevated,
    borderRightWidth: 1,
    borderRightColor: colors.border,
    height: '100%',
  },
  brand: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xl,
    gap: spacing.md,
  },
  brandMark: {
    width: 38,
    height: 38,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  brandMarkImage: {
    width: 30,
    height: 30,
  },
  brandName: {
    ...typography.h3,
    color: colors.textPrimary,
  },
  brandSub: {
    ...typography.caption,
    color: colors.textMuted,
  },
  menu: {
    flex: 1,
    paddingHorizontal: spacing.md,
  },
  group: {
    marginBottom: spacing.sm,
  },
  groupHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
  },
  groupDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  groupLabel: {
    ...typography.caption,
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    flex: 1,
  },
  chevron: {
    ...typography.caption,
    color: colors.textMuted,
    fontWeight: '700',
    width: 12,
    textAlign: 'center',
  },
  groupBox: {
    borderRadius: radius.lg,
    borderWidth: 1,
    overflow: 'hidden',
    backgroundColor: colors.surface,
    marginTop: spacing.xs,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: spacing.sm,
    gap: spacing.sm,
    position: 'relative',
  },
  itemDivider: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  activeBar: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 3,
  },
  itemIcon: {
    width: 18,
    textAlign: 'center',
    fontSize: 13,
  },
  itemLabel: {
    ...typography.body,
    color: colors.textSecondary,
  },
  footer: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    padding: spacing.lg,
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  avatar: {
    width: 34,
    height: 34,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    ...typography.small,
    color: colors.textPrimary,
    fontWeight: '700',
  },
  userName: {
    ...typography.bodyMedium,
    color: colors.textPrimary,
  },
  userRole: {
    ...typography.caption,
    color: colors.textMuted,
  },
  logoutBtn: {
    paddingVertical: 8,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
  },
  logoutText: {
    ...typography.small,
    color: colors.textSecondary,
  },
});
