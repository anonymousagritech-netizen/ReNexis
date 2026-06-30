import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, Platform, Pressable } from 'react-native';
import { colors, radius, spacing, typography } from '@/theme/theme';
import { listDocuments, uploadDocument, getDocumentDownloadUrl, deleteDocument } from '@/api/documents.api';
import { formatDate } from '@/utils/format';

export function DocumentsPanel({ contractId, claimId }: { contractId?: string; claimId?: string }) {
  const [documents, setDocuments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await listDocuments({ contractId, claimId });
      setDocuments(res.documents);
    } finally {
      setLoading(false);
    }
  }, [contractId, claimId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleFile = async (file: File) => {
    setUploading(true);
    setError(null);
    try {
      await uploadDocument(file, { title: file.name, category: 'OTHER', contractId, claimId });
      await fetchData();
    } catch (e) {
      setError('Upload failed. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id: string) => {
    await deleteDocument(id);
    fetchData();
  };

  return (
    <View>
      <View style={styles.headerRow}>
        <Text style={styles.title}>Documents</Text>
        {Platform.OS === 'web' && (
          <label style={{ cursor: 'pointer' as any }}>
            <input
              type="file"
              style={{ display: 'none' }}
              onChange={(e: any) => {
                const file = e.target.files?.[0];
                if (file) handleFile(file);
                e.target.value = '';
              }}
            />
            <View style={styles.uploadBtnWrap}>
              <Text style={styles.uploadBtnText}>{uploading ? 'Uploading…' : '+ Upload'}</Text>
            </View>
          </label>
        )}
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      {loading ? (
        <Text style={styles.muted}>Loading…</Text>
      ) : documents.length === 0 ? (
        <Text style={styles.muted}>No documents attached yet. Treaty wordings, slips, or claims files can be uploaded here.</Text>
      ) : (
        documents.map((d) => (
          <View key={d.id} style={styles.docRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.docTitle} numberOfLines={1}>{d.title}</Text>
              <Text style={styles.docMeta}>
                {d.category.replace(/_/g, ' ')} · {(d.sizeBytes / 1024).toFixed(0)} KB · {formatDate(d.createdAt)}
                {d.uploadedBy ? ` · ${d.uploadedBy.firstName} ${d.uploadedBy.lastName}` : ''}
              </Text>
            </View>
            <View style={styles.docActions}>
              {Platform.OS === 'web' ? (
                <a href={getDocumentDownloadUrl(d.id)} target="_blank" rel="noreferrer" style={{ textDecoration: 'none' }}>
                  <Text style={styles.linkBtn}>Download</Text>
                </a>
              ) : null}
              <Pressable onPress={() => handleDelete(d.id)}>
                <Text style={styles.deleteBtn}>Delete</Text>
              </Pressable>
            </View>
          </View>
        ))
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm },
  title: { ...typography.caption, color: colors.textMuted, textTransform: 'uppercase' },
  uploadBtnWrap: { backgroundColor: colors.surfaceAlt, borderWidth: 1, borderColor: colors.borderLight, borderRadius: radius.md, paddingHorizontal: spacing.md, paddingVertical: 6 },
  uploadBtnText: { ...typography.small, color: colors.primary, fontWeight: '700' },
  error: { ...typography.small, color: colors.danger, marginBottom: spacing.sm },
  muted: { ...typography.small, color: colors.textMuted, paddingVertical: spacing.sm },
  docRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.sm, borderTopWidth: 1, borderTopColor: colors.border },
  docTitle: { ...typography.body, color: colors.textPrimary },
  docMeta: { ...typography.caption, color: colors.textMuted, marginTop: 2 },
  docActions: { flexDirection: 'row', gap: spacing.md },
  linkBtn: { ...typography.small, color: colors.primary },
  deleteBtn: { ...typography.small, color: colors.danger },
});
