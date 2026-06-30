import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { colors, radius, spacing, typography } from '@/theme/theme';
import { Input, FormField } from '@/components/FormField';
import { Button } from '@/components/Button';
import { useAuth } from '@/auth/AuthContext';
import { getApiErrorMessage } from '@/api/client';

const DEMO_ACCOUNTS = [
  { role: 'ADMIN', email: 'admin@renexis.demo' },
  { role: 'UNDERWRITER', email: 'underwriter@renexis.demo' },
  { role: 'CLAIMS', email: 'claims@renexis.demo' },
  { role: 'ACCOUNTS', email: 'accounts@renexis.demo' },
  { role: 'ACTUARY', email: 'actuary@renexis.demo' },
  { role: 'AUDITOR', email: 'auditor@renexis.demo' },
  { role: 'COMPLIANCE', email: 'compliance@renexis.demo' },
  { role: 'INVESTMENT_MANAGER', email: 'investments@renexis.demo' },
];

export function LoginScreen() {
  const { login } = useAuth();
  const [email, setEmail] = useState('admin@renexis.demo');
  const [password, setPassword] = useState('Demo@12345');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    setError(null);
    setLoading(true);
    try {
      await login(email, password);
    } catch (e) {
      setError(getApiErrorMessage(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.root}>
      <View style={styles.panel}>
        <View style={styles.brandMark}>
          <Text style={styles.brandMarkText}>R</Text>
        </View>
        <Text style={styles.title}>ReNexis</Text>
        <Text style={styles.subtitle}>Reinsurance Operations Platform</Text>

        <View style={styles.form}>
          <FormField label="Email">
            <Input value={email} onChangeText={setEmail} placeholder="you@company.com" keyboardType="email-address" />
          </FormField>
          <FormField label="Password">
            <Input value={password} onChangeText={setPassword} placeholder="••••••••" secureTextEntry />
          </FormField>

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <Button label="Sign in" onPress={handleLogin} loading={loading} style={{ marginTop: spacing.sm }} />
        </View>

        <View style={styles.demoBox}>
          <Text style={styles.demoTitle}>Demo accounts (password: Demo@12345)</Text>
          <View style={styles.demoGrid}>
            {DEMO_ACCOUNTS.map((acc) => (
              <Pressable
                key={acc.email}
                onPress={() => {
                  setEmail(acc.email);
                  setPassword('Demo@12345');
                }}
                style={styles.demoChip}
              >
                <Text style={styles.demoChipText}>{acc.role.replace(/_/g, ' ')}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  panel: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.xxl,
    alignItems: 'center',
  },
  brandMark: {
    width: 52,
    height: 52,
    borderRadius: radius.lg,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  brandMarkText: {
    color: colors.white,
    fontWeight: '800',
    fontSize: 26,
  },
  title: {
    ...typography.h1,
    color: colors.textPrimary,
  },
  subtitle: {
    ...typography.body,
    color: colors.textSecondary,
    marginBottom: spacing.xl,
  },
  form: {
    width: '100%',
  },
  error: {
    ...typography.small,
    color: colors.danger,
    marginBottom: spacing.sm,
  },
  demoBox: {
    marginTop: spacing.xl,
    paddingTop: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    width: '100%',
  },
  demoTitle: {
    ...typography.caption,
    color: colors.textMuted,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  demoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    justifyContent: 'center',
  },
  demoChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  demoChipText: {
    ...typography.caption,
    color: colors.textSecondary,
  },
});
