/**
 * Add / Edit Candidate Modal with Validation and Temporary Credential Display
 * Traceability: FR-CAN-001, FR-CAN-002, FR-AUTH-005, FR-AUTH-009, Rule 5
 */

import React, { useState, useEffect } from 'react';
import { X, Check, Copy, ShieldAlert } from 'lucide-react';
import { CandidateRecord, CandidateInput } from '../../types/api';

interface CandidateFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  candidateToEdit?: CandidateRecord | null;
  onSubmit: (data: CandidateInput) => Promise<{ temporaryPassword?: string } | void>;
  driveOptions: string[];
}

export const CandidateFormModal: React.FC<CandidateFormModalProps> = ({
  isOpen,
  onClose,
  candidateToEdit,
  onSubmit,
  driveOptions,
}) => {
  const isEditing = Boolean(candidateToEdit);

  const [formData, setFormData] = useState<CandidateInput>({
    candidateIdentifier: '',
    fullName: '',
    username: '',
    email: '',
    phone: '',
    institution: '',
    qualification: '',
    graduationYear: 2026,
    recruitmentReference: driveOptions[0] || 'Autumn Campus 2026',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createdTempPassword, setCreatedTempPassword] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (candidateToEdit) {
      setFormData({
        candidateIdentifier: candidateToEdit.candidateIdentifier,
        fullName: candidateToEdit.fullName,
        username: candidateToEdit.username,
        email: candidateToEdit.email,
        phone: candidateToEdit.phone || '',
        institution: candidateToEdit.institution,
        qualification: candidateToEdit.qualification,
        graduationYear: candidateToEdit.graduationYear,
        recruitmentReference: candidateToEdit.recruitmentReference,
      });
    } else {
      setFormData({
        candidateIdentifier: `CAN-2026-${Math.floor(100 + Math.random() * 900)}`,
        fullName: '',
        username: '',
        email: '',
        phone: '',
        institution: '',
        qualification: 'B.Tech Computer Science',
        graduationYear: 2026,
        recruitmentReference: driveOptions[0] || 'Autumn Campus 2026',
      });
    }
    setErrors({});
    setCreatedTempPassword(null);
    setCopied(false);
  }, [candidateToEdit, isOpen, driveOptions]);

  if (!isOpen) return null;

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.candidateIdentifier.trim()) {
      newErrors.candidateIdentifier = 'Candidate ID is required (e.g. CAN-2026-001).';
    }
    if (!formData.fullName.trim()) {
      newErrors.fullName = 'Full candidate name is required.';
    }
    if (!formData.username.trim()) {
      newErrors.username = 'Username is required.';
    }
    if (!formData.email.trim()) {
      newErrors.email = 'Email address is required.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please provide a valid email address.';
    }
    if (!formData.institution.trim()) {
      newErrors.institution = 'Institution / University is required.';
    }
    if (!formData.qualification.trim()) {
      newErrors.qualification = 'Degree qualification is required.';
    }
    if (
      !formData.graduationYear ||
      formData.graduationYear < 2000 ||
      formData.graduationYear > 2035
    ) {
      newErrors.graduationYear = 'Graduation year must be between 2000 and 2035.';
    }
    if (!formData.recruitmentReference.trim()) {
      newErrors.recruitmentReference = 'Recruitment drive reference is required.';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    try {
      setIsSubmitting(true);
      const res = await onSubmit(formData);
      if (!isEditing && res && res.temporaryPassword) {
        setCreatedTempPassword(res.temporaryPassword);
      } else {
        onClose();
      }
    } catch {
      // Error handled by caller/mutation
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCopyCredentials = () => {
    if (!createdTempPassword) return;
    const textToCopy = `Candidate ID: ${formData.candidateIdentifier}\nUsername: ${formData.username}\nTemporary Password: ${createdTempPassword}`;
    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4"
      data-testid="candidate-form-modal"
    >
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-xl overflow-hidden transition-all animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-slate-900">
              {createdTempPassword
                ? 'Candidate Registered Successfully'
                : isEditing
                  ? 'Edit Candidate Profile'
                  : 'Add New Candidate'}
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              {createdTempPassword
                ? 'Secure one-time credentials generated (FR-AUTH-005).'
                : isEditing
                  ? 'Update candidate information and academic enrollment details.'
                  : 'Enroll a student candidate into the VeriSync assessment roster.'}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
            data-testid="modal-close-btn"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        {createdTempPassword ? (
          /* Success Screen with One-Time Generated Password */
          <div className="p-6 space-y-5">
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-start gap-3">
              <div className="p-2 bg-emerald-100 text-emerald-700 rounded-lg shrink-0">
                <Check className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-emerald-900">
                  Candidate account created for {formData.fullName}
                </h4>
                <p className="text-xs text-emerald-700 mt-1">
                  Candidate ID: <strong>{formData.candidateIdentifier}</strong> (Username:{' '}
                  <code>{formData.username}</code>)
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                One-Time Temporary Password
              </label>
              <div className="flex items-center justify-between p-3.5 bg-slate-900 text-emerald-400 font-mono text-sm rounded-xl border border-slate-800">
                <span data-testid="temp-password-value">{createdTempPassword}</span>
                <button
                  type="button"
                  onClick={handleCopyCredentials}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-sans font-medium rounded-lg transition-colors border border-slate-700"
                  data-testid="copy-credentials-btn"
                >
                  {copied ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="text-emerald-400">Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy Credentials</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-2.5 text-xs text-amber-800">
              <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <p>
                <strong>Security Rule:</strong> This temporary password will not be shown again. The
                candidate must change their password upon their first login (FR-AUTH-009).
              </p>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm transition-colors"
                data-testid="modal-done-btn"
              >
                Done
              </button>
            </div>
          </div>
        ) : (
          /* Form Inputs */
          <form onSubmit={handleSubmit} className="p-6 space-y-4" data-testid="candidate-form">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Candidate ID */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Candidate ID <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  disabled={isEditing}
                  value={formData.candidateIdentifier}
                  onChange={(e) =>
                    setFormData({ ...formData, candidateIdentifier: e.target.value.toUpperCase() })
                  }
                  placeholder="e.g. CAN-2026-001"
                  className={`w-full px-3 py-2 text-sm border rounded-lg bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-60 disabled:cursor-not-allowed ${
                    errors.candidateIdentifier ? 'border-rose-400' : 'border-slate-300'
                  }`}
                  data-testid="input-candidate-id"
                />
                {errors.candidateIdentifier && (
                  <p className="text-xs text-rose-600 mt-1">{errors.candidateIdentifier}</p>
                )}
              </div>

              {/* Recruitment Drive */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Recruitment Drive <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  list="drive-list"
                  value={formData.recruitmentReference}
                  onChange={(e) =>
                    setFormData({ ...formData, recruitmentReference: e.target.value })
                  }
                  placeholder="e.g. Autumn Campus 2026"
                  className={`w-full px-3 py-2 text-sm border rounded-lg bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.recruitmentReference ? 'border-rose-400' : 'border-slate-300'
                  }`}
                  data-testid="input-recruitment-reference"
                />
                <datalist id="drive-list">
                  {driveOptions.map((opt) => (
                    <option key={opt} value={opt} />
                  ))}
                </datalist>
                {errors.recruitmentReference && (
                  <p className="text-xs text-rose-600 mt-1">{errors.recruitmentReference}</p>
                )}
              </div>

              {/* Full Name */}
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Full Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.fullName}
                  onChange={(e) => {
                    const fullName = e.target.value;
                    const autoUsername = isEditing
                      ? formData.username
                      : fullName
                          .toLowerCase()
                          .replace(/\s+/g, '.')
                          .replace(/[^a-z0-9.]/g, '');
                    setFormData({ ...formData, fullName, username: autoUsername });
                  }}
                  placeholder="e.g. Priya Sharma"
                  className={`w-full px-3 py-2 text-sm border rounded-lg bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.fullName ? 'border-rose-400' : 'border-slate-300'
                  }`}
                  data-testid="input-full-name"
                />
                {errors.fullName && <p className="text-xs text-rose-600 mt-1">{errors.fullName}</p>}
              </div>

              {/* Username */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Username <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  placeholder="e.g. priya.sharma"
                  className={`w-full px-3 py-2 text-sm border rounded-lg bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.username ? 'border-rose-400' : 'border-slate-300'
                  }`}
                  data-testid="input-username"
                />
                {errors.username && <p className="text-xs text-rose-600 mt-1">{errors.username}</p>}
              </div>

              {/* Email */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Email Address <span className="text-rose-500">*</span>
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="e.g. priya.sharma@college.edu"
                  className={`w-full px-3 py-2 text-sm border rounded-lg bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.email ? 'border-rose-400' : 'border-slate-300'
                  }`}
                  data-testid="input-email"
                />
                {errors.email && <p className="text-xs text-rose-600 mt-1">{errors.email}</p>}
              </div>

              {/* Phone */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Phone Number (Optional)
                </label>
                <input
                  type="tel"
                  value={formData.phone || ''}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="e.g. +91 9876543210"
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  data-testid="input-phone"
                />
              </div>

              {/* Graduation Year */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Graduation Year <span className="text-rose-500">*</span>
                </label>
                <input
                  type="number"
                  value={formData.graduationYear}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      graduationYear: parseInt(e.target.value, 10) || 2026,
                    })
                  }
                  className={`w-full px-3 py-2 text-sm border rounded-lg bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.graduationYear ? 'border-rose-400' : 'border-slate-300'
                  }`}
                  data-testid="input-graduation-year"
                />
                {errors.graduationYear && (
                  <p className="text-xs text-rose-600 mt-1">{errors.graduationYear}</p>
                )}
              </div>

              {/* Institution */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Institution / University <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.institution}
                  onChange={(e) => setFormData({ ...formData, institution: e.target.value })}
                  placeholder="e.g. National Institute of Technology"
                  className={`w-full px-3 py-2 text-sm border rounded-lg bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.institution ? 'border-rose-400' : 'border-slate-300'
                  }`}
                  data-testid="input-institution"
                />
                {errors.institution && (
                  <p className="text-xs text-rose-600 mt-1">{errors.institution}</p>
                )}
              </div>

              {/* Qualification */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Degree / Qualification <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.qualification}
                  onChange={(e) => setFormData({ ...formData, qualification: e.target.value })}
                  placeholder="e.g. B.Tech Computer Science"
                  className={`w-full px-3 py-2 text-sm border rounded-lg bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.qualification ? 'border-rose-400' : 'border-slate-300'
                  }`}
                  data-testid="input-qualification"
                />
                {errors.qualification && (
                  <p className="text-xs text-rose-600 mt-1">{errors.qualification}</p>
                )}
              </div>
            </div>

            {/* Modal Actions */}
            <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
                data-testid="modal-cancel-btn"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={isSubmitting}
                className="inline-flex items-center gap-2 px-5 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm transition-colors disabled:opacity-50"
                data-testid="modal-submit-btn"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <span>{isEditing ? 'Save Changes' : 'Register Candidate'}</span>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
