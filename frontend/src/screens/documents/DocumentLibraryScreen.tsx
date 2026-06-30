import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { ScreenHeader } from '@/components/ScreenHeader';
import { Card } from '@/components/Card';
import { DataTable, Column } from '@/components/DataTable';
import { colors, radius, spacing, typography, moduleColors } from '@/theme/theme';
import { listDocuments, uploadDocument, getDocumentDownloadUrl } from '@/api/documents.api';
import { formatDate } from '@/utils/format';
import { SelectField } from '@/components/FormField';

const CATEGORY_OPTIONS = [
  { label: 'All', value: '' },
  { label: 'Treaty Wording', value: 'TREATY_WORDING' },
  { label: 'Slip', value: 'SLIP' },
  { label: 'Bordereaux', value: 'BORDEREAUX' },
  { label: 'Claims Doc', value: 'CLAIMS_DOC' },
  { label: 'Compliance', value: 'COMPLIANCE' },
  { label: 'Other', value: 'OTHER' },
];

export function DocumentLibraryScreen() {
  const [documents, setDocuments] = useState<any[]>([]);
  const [category, setCategory] = useState('');
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await listDocuments({ category: category || undefined, pageSize: 100 });
      setDocuments(res.documents);
    } finally {
      setLoading(false);
    }
  }, [category]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleFile = async (file: File) => {
    setUploading(true);
    try {
      await uploadDocument(file, { title: file.name, category: 'OTHER' });
      await fetchData();
    } finally {
      setUploading(false);
    }
  };

  const columns: Column<any>[] = [
    { key: 'title', header: 'Title', width: 280, render: (r) => r.title },
    { key: 'category', header: 'Category', width: 160, render: (r) => r.category.replace(/_/g, ' ') },
    { key: 'contractId', header: 'Linked To', width: 160, render: (r) => (r.contractId ? 'Contract' : r.claimId ? 'Claim' : 'General') },
    { key: 'size', header: 'Size', width: 100, render: (r) => `${(r.sizeBytes / 1024).toFixed(0)} KB` },
    { key: 'uploadedBy', header: 'Uploaded By', width: 180, render: (r) => (r.uploadedBy ? `${r.uploadedBy.firstName} ${r.uploadedBy.lastName}` : '—') },
    { key: 'createdAt', header: 'Date', width: 120, render: (r) => formatDate(r.createdAt) },
    {
      key: 'actions',
      header: '',
      width: 120,
      render: (r) =>
        Platform.OS === 'web' ? (
          <a href={getDocumentDownloadUrl(r.id)} target="_blank" rel="noreferrer" style={{ textDecoration: 'none' }}>
            <Text style={{ color: colors.primary, fontSize: 13 }}>Download</Text>
          </a>
        ) : null,
    },
  ];

  return (
    <View>
      <ScreenHeader accentColor={moduleColors.system.main}         title="Document Library"
        subtitle="Module 1 · Treaty wordings, slips, bordereaux files, claims documents — all linked to their parent record"
        actions={
          Platform.OS === 'web' ? (
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
                <Text style={styles.uploadBtnText}>{uploading ? 'Uploading…' : '+ Upload Document'}</Text>
              </View>
            </label>
          ) : undefined
        }
      />

      <Card style={{ marginBottom: spacing.md }}>
        <Text style={styles.filterLabel}>Category</Text>
        <SelectField value={category} options={CATEGORY_OPTIONS} onChange={setCategory} />
      </Card>

      <Card>
        <DataTable columns={columns} data={documents} loading={loading} emptyMessage="No documents uploaded yet." />
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  filterLabel: { ...typography.caption, color: colors.textMuted, textTransform: 'uppercase', marginBottom: spacing.sm },
  uploadBtnWrap: { backgroundColor: colors.primary, borderRadius: radius.md, paddingHorizontal: spacing.lg, paddingVertical: 10 },
  uploadBtnText: { ...typography.bodyMedium, color: colors.white },
});
