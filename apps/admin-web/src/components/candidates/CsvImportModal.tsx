/**
 * CSV Bulk Candidate Import Modal with Downloadable Error Report
 * Traceability: FR-CAN-003, Rule 6
 */

import React, { useState, useRef } from 'react';
import {
  X,
  UploadCloud,
  FileText,
  Download,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
} from 'lucide-react';
import { CandidateCsvImportResult } from '../../types/api';

interface CsvImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (csvText: string) => Promise<CandidateCsvImportResult>;
  onSuccessRefresh: () => void;
}

const SAMPLE_CSV = `candidateIdentifier,fullName,username,email,phone,institution,qualification,graduationYear,recruitmentReference
CAN-2026-101,Aarav Sen,aarav.sen,aarav.sen@iitk.ac.in,+91 9876500001,IIT Kanpur,B.Tech CSE,2026,Autumn Campus 2026
CAN-2026-102,Meera Nair,meera.nair,meera.nair@nitc.ac.in,+91 9876500002,NIT Calicut,B.Tech ECE,2026,Autumn Campus 2026`;

export const CsvImportModal: React.FC<CsvImportModalProps> = ({
  isOpen,
  onClose,
  onImport,
  onSuccessRefresh,
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [csvContent, setCsvContent] = useState<string>('');
  const [isUploading, setIsUploading] = useState(false);
  const [importResult, setImportResult] = useState<CandidateCsvImportResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleDownloadSample = () => {
    const blob = new Blob([SAMPLE_CSV], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'verisync_candidates_template.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    if (typeof selectedFile.text === 'function') {
      const text = await selectedFile.text();
      setCsvContent(text);
    } else {
      const reader = new FileReader();
      reader.onload = (event) => {
        setCsvContent((event.target?.result as string) || '');
      };
      reader.readAsText(selectedFile);
    }
  };

  const handleImportSubmit = async () => {
    if (!csvContent) return;

    try {
      setIsUploading(true);
      const result = await onImport(csvContent);
      setImportResult(result);
      if (result.importedCount > 0) {
        onSuccessRefresh();
      }
    } catch {
      // Error handled by mutation
    } finally {
      setIsUploading(false);
    }
  };

  const handleDownloadErrorReport = () => {
    if (!importResult || importResult.errors.length === 0) return;

    const errorHeader = 'Row,CandidateIdentifier,Field,Error\n';
    const errorRows = importResult.errors
      .map(
        (err) =>
          `${err.row},"${err.candidateId || ''}","${err.field || ''}","${err.error.replace(/"/g, '""')}"`,
      )
      .join('\n');

    const blob = new Blob([errorHeader + errorRows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `candidate_import_errors_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleReset = () => {
    setFile(null);
    setCsvContent('');
    setImportResult(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4"
      data-testid="csv-import-modal"
    >
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-xl overflow-hidden transition-all animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-slate-900">Bulk Candidate Import</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Upload candidate roster from CSV file with automated validation (FR-CAN-003).
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
            data-testid="csv-modal-close-btn"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5">
          {!importResult ? (
            /* Upload Step */
            <>
              {/* Sample Template Callout */}
              <div className="p-3.5 bg-blue-50/70 border border-blue-200 rounded-xl flex items-center justify-between text-xs text-blue-900">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-blue-600 shrink-0" />
                  <span>Use standard VeriSync CSV template for structured enrollment.</span>
                </div>
                <button
                  type="button"
                  onClick={handleDownloadSample}
                  className="inline-flex items-center gap-1 font-semibold text-blue-700 hover:text-blue-800 underline shrink-0 ml-2"
                  data-testid="btn-download-sample"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Sample CSV</span>
                </button>
              </div>

              {/* Upload Dropzone */}
              <div
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
                  file
                    ? 'border-blue-500 bg-blue-50/30'
                    : 'border-slate-300 hover:border-blue-400 hover:bg-slate-50'
                }`}
                data-testid="csv-dropzone"
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,text/csv"
                  onChange={handleFileChange}
                  className="hidden"
                  data-testid="csv-file-input"
                />

                <UploadCloud className="w-10 h-10 text-blue-600 mx-auto mb-2" />
                <p className="text-sm font-semibold text-slate-800">
                  {file ? file.name : 'Click to select or drag and drop CSV file'}
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  {file
                    ? `${(file.size / 1024).toFixed(1)} KB • Ready for import`
                    : 'Only .csv format up to 5MB is supported'}
                </p>
              </div>

              {/* Action Buttons */}
              <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  disabled={!csvContent || isUploading}
                  onClick={handleImportSubmit}
                  className="inline-flex items-center gap-2 px-5 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm transition-colors disabled:opacity-50"
                  data-testid="btn-submit-csv"
                >
                  {isUploading ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Processing CSV...</span>
                    </>
                  ) : (
                    <span>Import Candidates</span>
                  )}
                </button>
              </div>
            </>
          ) : (
            /* Results Step with Error Report */
            <div className="space-y-4" data-testid="csv-results-view">
              {/* Summary KPIs */}
              <div className="grid grid-cols-3 gap-3">
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-center">
                  <span className="text-xs text-slate-500 font-medium">Total Rows</span>
                  <p className="text-xl font-bold text-slate-800 mt-0.5">
                    {importResult.totalRows}
                  </p>
                </div>
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-center">
                  <span className="text-xs text-emerald-700 font-medium">Imported</span>
                  <p
                    className="text-xl font-bold text-emerald-800 mt-0.5"
                    data-testid="imported-count"
                  >
                    {importResult.importedCount}
                  </p>
                </div>
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-center">
                  <span className="text-xs text-rose-700 font-medium">Errors</span>
                  <p className="text-xl font-bold text-rose-800 mt-0.5" data-testid="error-count">
                    {importResult.errorCount}
                  </p>
                </div>
              </div>

              {/* Success Banner if all or partial */}
              {importResult.importedCount > 0 && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2 text-xs text-emerald-800">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>
                    Successfully registered {importResult.importedCount} candidates into the system.
                  </span>
                </div>
              )}

              {/* Error Details Table (FR-CAN-003) */}
              {importResult.errorCount > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-rose-900 flex items-center gap-1.5">
                      <AlertTriangle className="w-4 h-4 text-rose-600" />
                      <span>Import Error Breakdown ({importResult.errorCount})</span>
                    </span>

                    <button
                      type="button"
                      onClick={handleDownloadErrorReport}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-rose-700 hover:text-rose-900 underline"
                      data-testid="btn-download-error-report"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Download Error Report (CSV)</span>
                    </button>
                  </div>

                  <div className="max-h-48 overflow-y-auto border border-rose-200 rounded-xl">
                    <table className="min-w-full divide-y divide-rose-100 text-xs">
                      <thead className="bg-rose-50/70 text-rose-900 font-semibold sticky top-0">
                        <tr>
                          <th className="px-3 py-2 text-left">Row</th>
                          <th className="px-3 py-2 text-left">Candidate ID</th>
                          <th className="px-3 py-2 text-left">Field</th>
                          <th className="px-3 py-2 text-left">Error Description</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-rose-100 bg-white">
                        {importResult.errors.map((err, idx) => (
                          <tr key={idx} className="hover:bg-rose-50/40">
                            <td className="px-3 py-2 font-mono text-slate-600">{err.row}</td>
                            <td className="px-3 py-2 font-mono text-slate-800">
                              {err.candidateId || 'N/A'}
                            </td>
                            <td className="px-3 py-2 font-medium text-slate-700">
                              {err.field || 'general'}
                            </td>
                            <td className="px-3 py-2 text-rose-700">{err.error}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="pt-3 border-t border-slate-200 flex items-center justify-between">
                <button
                  type="button"
                  onClick={handleReset}
                  className="text-xs text-blue-600 hover:underline font-medium"
                >
                  Upload another CSV
                </button>

                <button
                  type="button"
                  onClick={onClose}
                  className="px-5 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm transition-colors"
                  data-testid="btn-close-import"
                >
                  Done
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
