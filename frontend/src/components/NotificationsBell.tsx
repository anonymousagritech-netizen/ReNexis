import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { colors, radius, spacing, typography } from '@/theme/theme';
import { listNotifications, markNotificationRead, markAllNotificationsRead } from '@/api/notifications.api';

export function NotificationsBell() {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchData = useCallback(async () => {
    try {
      const res = await listNotifications();
      setNotifications(res.notifications);
      setUnreadCount(res.unreadCount);
    } catch {
      // non-fatal — notifications are a convenience layer
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 60000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const handleOpen = () => {
    setOpen((o) => !o);
    if (!open) fetchData();
  };

  const handleMarkAll = async () => {
    await markAllNotificationsRead();
    fetchData();
  };

  return (
    <View style={{ position: 'relative' }}>
      <Pressable onPress={handleOpen} style={styles.bellBtn}>
        <Text style={styles.bellIcon}>🔔</Text>
        {unreadCount > 0 && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
          </View>
        )}
      </Pressable>

      {open && (
        <View style={styles.dropdown}>
          <View style={styles.dropdownHeader}>
            <Text style={styles.dropdownTitle}>Notifications</Text>
            {unreadCount > 0 && (
              <Pressable onPress={handleMarkAll}>
                <Text style={styles.markAllText}>Mark all read</Text>
              </Pressable>
            )}
          </View>
          <ScrollView style={styles.list}>
            {notifications.length === 0 ? (
              <Text style={styles.empty}>No notifications yet.</Text>
            ) : (
              notifications.map((n) => (
                <Pressable
                  key={n.id}
                  onPress={async () => {
                    if (!n.isRead) {
                      await markNotificationRead(n.id);
                      fetchData();
                    }
                  }}
                  style={[styles.item, !n.isRead && styles.itemUnread]}
                >
                  <Text style={styles.itemTitle}>{n.title}</Text>
                  <Text style={styles.itemMessage} numberOfLines={2}>{n.message}</Text>
                  <Text style={styles.itemTime}>{new Date(n.createdAt).toLocaleString()}</Text>
                </Pressable>
              ))
            )}
          </ScrollView>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  bellBtn: {
    width: 38,
    height: 38,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bellIcon: { fontSize: 16 },
  badge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: colors.danger,
    borderRadius: radius.pill,
    minWidth: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  badgeText: { color: colors.white, fontSize: 10, fontWeight: '700' },
  dropdown: {
    position: 'absolute',
    top: 46,
    right: 0,
    width: 340,
    backgroundColor: colors.bgElevated,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    zIndex: 100,
    elevation: 10,
  },
  dropdownHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  dropdownTitle: { ...typography.bodyMedium, color: colors.textPrimary },
  markAllText: { ...typography.small, color: colors.primary },
  list: { maxHeight: 360 },
  empty: { ...typography.small, color: colors.textMuted, padding: spacing.lg, textAlign: 'center' },
  item: { paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.border },
  itemUnread: { backgroundColor: colors.primarySoft },
  itemTitle: { ...typography.small, color: colors.textPrimary, fontWeight: '700' },
  itemMessage: { ...typography.caption, color: colors.textSecondary, marginTop: 2 },
  itemTime: { ...typography.caption, color: colors.textMuted, marginTop: 4 },
});
