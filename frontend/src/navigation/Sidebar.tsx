import React, { useMemo } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { colors, radius, spacing, typography } from '@/theme/theme';
import { getVisibleRoutes, RouteKey } from './routes';
import { useAppNavigation } from './NavigationContext';
import { useAuth } from '@/auth/AuthContext';

export function Sidebar() {
  const { user, logout } = useAuth();
  const { current, navigate } = useAppNavigation();

  const grouped = useMemo(() => {
    if (!user) return [];
    const visible = getVisibleRoutes(user.role);
    const groups = new Map<string, typeof visible>();
    for (const r of visible) {
      const arr = groups.get(r.group) || [];
      arr.push(r);
      groups.set(r.group, arr);
    }
    return Array.from(groups.entries());
  }, [user]);

  return (
    <View style={styles.sidebar}>
      <View style={styles.brand}>
        <View style={styles.brandMark}>
          <Text style={styles.brandMarkText}>R</Text>
        </View>
        <View>
          <Text style={styles.brandName}>ReNexis</Text>
          <Text style={styles.brandSub}>Reinsurance Platform</Text>
        </View>
      </View>

      <ScrollView style={styles.menu} showsVerticalScrollIndicator={false}>
        {grouped.map(([group, items]) => (
          <View key={group} style={styles.group}>
            <Text style={styles.groupLabel}>{group}</Text>
            {items.map((item) => {
              const active = current.route === item.key;
              return (
                <Pressable
                  key={item.key}
                  onPress={() => navigate(item.key as RouteKey)}
                  style={[styles.item, active && styles.itemActive]}
                >
                  <Text style={[styles.itemIcon, active && styles.itemIconActive]}>{item.icon}</Text>
                  <Text style={[styles.itemLabel, active && styles.itemLabelActive]}>{item.label}</Text>
                </Pressable>
              );
            })}
          </View>
        ))}
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
    width: 248,
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
    width: 36,
    height: 36,
    borderRadius: radius.md,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandMarkText: {
    color: colors.white,
    fontWeight: '800',
    fontSize: 18,
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
    marginBottom: spacing.lg,
  },
  groupLabel: {
    ...typography.caption,
    color: colors.textMuted,
    textTransform: 'uppercase',
    paddingHorizontal: spacing.sm,
    marginBottom: spacing.xs,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 9,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.md,
    gap: spacing.sm,
  },
  itemActive: {
    backgroundColor: colors.primarySoft,
  },
  itemIcon: {
    width: 18,
    textAlign: 'center',
    color: colors.textMuted,
    fontSize: 13,
  },
  itemIconActive: {
    color: colors.primary,
  },
  itemLabel: {
    ...typography.body,
    color: colors.textSecondary,
  },
  itemLabelActive: {
    color: colors.textPrimary,
    fontWeight: '600',
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
