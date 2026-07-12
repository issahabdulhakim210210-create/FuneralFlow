import React, { useEffect, useMemo, useState, useRef } from 'react';
import { Alert, FlatList, Linking, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import SafePressable from '../components/SafePressable';
import { Screen } from '../components/Screen';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { Input } from '../components/Input';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';

type Tab = 'overview' | 'planning' | 'oneweek' | 'preparations' | 'checklists' | 'timeline' | 'volunteers' | 'expenses' | 'donations' | 'notes' | 'relatives';

export default function SessionDetailScreen({ route, navigation }: any) {
  const { user } = useAuth();
  const { id } = route.params;
  const collectorParam = (route.params && (route.params.collectorName || route.params.collectorIdentifier)) ? { collectorName: route.params.collectorName, collectorIdentifier: route.params.collectorIdentifier } : null;
  const collectorIdentifierStr = collectorParam?.collectorIdentifier ? String(collectorParam.collectorIdentifier).trim().toUpperCase() : '';
  const collectorNameStr = collectorParam?.collectorName ? String(collectorParam.collectorName) : '';
  const isOrganizerAssistView = Boolean(collectorIdentifierStr);
  const isOrganizer = user?.role === 'ORGANIZER';
  const [session, setSession] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<Tab>(isOrganizer || isOrganizerAssistView ? 'donations' : 'checklists');
  const [loading, setLoading] = useState(true);
  const [checklists, setChecklists] = useState<any[]>([]);
  const [timelines, setTimelines] = useState<any[]>([]);
  const [volunteers, setVolunteers] = useState<any[]>([]);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [notes, setNotes] = useState<any[]>([]);
  const [planning, setPlanning] = useState<any>(null);
  const [oneWeek, setOneWeek] = useState<any>(null);
  const [preparations, setPreparations] = useState<any>(null);
  const [sessionCollectors, setSessionCollectors] = useState<any[]>([]);
  const [collectorsLoading, setCollectorsLoading] = useState(false);
  const [donationRequests, setDonationRequests] = useState<any[]>([]);
  const [donationRequestsLoading, setDonationRequestsLoading] = useState(false);
  const [planningForm, setPlanningForm] = useState<any>({ 
    funeralDate: '', 
    budgetFinal: '', 
    venue: '', 
    burialLocation: '', 
    accommodationInfo: '',
    familyRepresentatives: '',
    keyContacts: '',
    culturalPractices: '',
    noOfGuests: '',
    mortuaryArrangements: ''
  });
  
  const [oneWeekForm, setOneWeekForm] = useState<any>({ announcement: '', contributions: [] as any[], committees: [] as any[] });
  const [oneWeekInputs, setOneWeekInputs] = useState({ contribName: '', contribAmount: '', committeeName: '', committeeRole: '' });
  const [preparationsForm, setPreparationsForm] = useState<any>({ mortuary: '', printing: '', logistics: '', finance: '', religious_services: '' });
  const [newItem, setNewItem] = useState('');
  const [newChecklist, setNewChecklist] = useState('');
  const [newItemAmount, setNewItemAmount] = useState('');
  const [donations, setDonations] = useState<any[]>([]);
  const [selectedCollector, setSelectedCollector] = useState<string | null>(collectorParam?.collectorName || null);
  const [donorName, setDonorName] = useState('');
  const [donorPhone, setDonorPhone] = useState('');
  const [donationAmount, setDonationAmount] = useState('');
  const [donationNotes, setDonationNotes] = useState('');
  const [donationPaid, setDonationPaid] = useState(false);
  const [donationLoading, setDonationLoading] = useState(false);
  const [collectorCount, setCollectorCount] = useState<string>('');
  const [approvalStatus, setApprovalStatus] = useState<'approved' | 'pending' | 'denied' | null>(null);
  
  const [autoSaveStatus, setAutoSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const autoSaveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [completingSession, setCompletingSession] = useState(false);
  const [relatives, setRelatives] = useState<any[]>([]);
  const [relativeName, setRelativeName] = useState('');
  const [relativeRelationship, setRelativeRelationship] = useState('');

  async function loadSession() {
    try {
      setLoading(true);
      const isPublicCollectorView = Boolean(collectorIdentifierStr);
      const publicSessionPath = isPublicCollectorView
        ? `/public/sessions/${id}?organizerIdentifier=${encodeURIComponent(collectorIdentifierStr)}${collectorNameStr ? `&collectorName=${encodeURIComponent(collectorNameStr)}` : ''}`
        : `/sessions/${id}`;
      const publicDonationsPath = isPublicCollectorView
        ? `/public/sessions/${id}/donations?organizerIdentifier=${encodeURIComponent(collectorIdentifierStr)}${collectorNameStr ? `&collectorName=${encodeURIComponent(collectorNameStr)}` : ''}`
        : `/sessions/${id}/donations`;

      let sessionRes: any = null;
      try {
        sessionRes = await api.get(publicSessionPath);
        setSession(sessionRes.data);
        setCollectorCount(String(sessionRes.data?.session_meta?.collector_count || ''));
        setRelatives(Array.isArray(sessionRes.data?.session_meta?.relatives) ? sessionRes.data.session_meta.relatives : []);
        setApprovalStatus('approved');
      } catch (e: any) {
        if (e?.response?.status === 403 && e?.response?.data?.code === 'APPROVAL_PENDING') {
          setApprovalStatus('pending');
          // Still load the session but mark as pending approval
          setSession(null);
          setDonations([]);
          Alert.alert('Awaiting Approval', e?.response?.data?.message || 'Your access is awaiting organizer approval.');
          return;
        } else if (e?.response?.status === 403) {
          Alert.alert('Access Denied', e?.response?.data?.message || 'You do not have access to this session.');
          return;
        }
        throw e;
      }

      try {
        const donationRes = await api.get(publicDonationsPath);
        setDonations(Array.isArray(donationRes.data) ? donationRes.data : []);
      } catch (e: any) {
        if (e?.response?.status === 403 && e?.response?.data?.code === 'APPROVAL_PENDING') {
          setApprovalStatus('pending');
          setDonations([]);
          Alert.alert('Awaiting Approval', e?.response?.data?.message || 'Your access is awaiting organizer approval.');
          return;
        } else if (e?.response?.status === 403) {
          Alert.alert('Access Denied', e?.response?.data?.message || 'You do not have access to donations.');
          return;
        }
        throw e;
      }

      if (!isPublicCollectorView) {
        const [checklistRes, timelineRes, volunteerRes, expenseRes, noteRes] = await Promise.all([
          api.get(`/sessions/${id}/checklists`),
          api.get(`/sessions/${id}/timelines`),
          api.get(`/sessions/${id}/volunteers`),
          api.get(`/sessions/${id}/expenses`),
          api.get(`/sessions/${id}/notes`),
        ]);
        setChecklists(Array.isArray(checklistRes.data) ? checklistRes.data : []);
        setTimelines(Array.isArray(timelineRes.data) ? timelineRes.data : []);
        setVolunteers(Array.isArray(volunteerRes.data) ? volunteerRes.data : []);
        setExpenses(Array.isArray(expenseRes.data) ? expenseRes.data : []);
        setNotes(Array.isArray(noteRes.data) ? noteRes.data : []);

        try {
          const [planningRes, oneWeekRes, prepRes] = await Promise.all([
            api.get(`/sessions/${id}/planning`).catch(() => ({ data: null })),
            api.get(`/sessions/${id}/one-week`).catch(() => ({ data: null })),
            api.get(`/sessions/${id}/preparations`).catch(() => ({ data: null })),
          ]);
          const p = planningRes.data || null;
          const w = oneWeekRes.data || null;
          const pr = prepRes.data || null;
          setPlanning(p);
          setOneWeek(w);
          setPreparations(pr);
          const loadedBudget = p?.budget_final ?? sessionRes?.data?.budget_final ?? '';

          setPlanningForm({
            funeralDate: p?.funeral_date || sessionRes?.data?.funeral_date || '',
            budgetFinal: loadedBudget,
            venue: p?.venue || sessionRes?.data?.session_meta?.venue || '',
            burialLocation: p?.burial_location || sessionRes?.data?.session_meta?.burial_location || '',
            accommodationInfo: p?.accommodation_info || sessionRes?.data?.session_meta?.accommodation_info || '',
            familyRepresentatives: p?.family_representatives || '',
            keyContacts: p?.key_contacts || '',
            culturalPractices: p?.cultural_practices || '',
            noOfGuests: p?.no_of_guests ? String(p.no_of_guests) : '',
            mortuaryArrangements: p?.mortuary_arrangements || '',
          });
          setOneWeekForm({
            announcement: w?.announcement || '',
            contributions: Array.isArray(w?.contributions) ? w.contributions : [],
            committees: Array.isArray(w?.committees) ? w.committees : [],
          });
          setPreparationsForm({
            mortuary: pr?.mortuary || '',
            printing: pr?.printing || '',
            logistics: pr?.logistics || '',
            finance: pr?.finance || '',
            religious_services: pr?.religious_services || '',
          });

          if (isOrganizer) {
            loadSessionCollectors(id);
            loadDonationRequests(id);
          }
        } catch (e) {
          // ignore individual meta load errors
        }
      } else {
        setChecklists([]);
        setTimelines([]);
        setVolunteers([]);
        setExpenses([]);
        setNotes([]);
        setPlanning(null);
        setOneWeek(null);
        setPreparations(null);
      }
    } catch (error: any) {
      Alert.alert('Error', error?.message || 'Could not load session');
    } finally {
      setLoading(false);
    }
  }

  async function handleCompleteSession() {
    try {
      Alert.alert(
        'Complete Planning',
        'This will mark the session as completed and send the overview to the family. This action cannot be undone. Continue?',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Complete', style: 'destructive', onPress: async () => {
            try {
              const { data } = await api.post(`/sessions/${id}/complete`);
              setSession(data.session || data);
              Alert.alert('Session Completed', 'The session has been marked completed and the overview sent to the family.');
            } catch (e: any) {
              Alert.alert('Error', e?.response?.data?.message || e?.message || 'Could not complete session');
            }
          } }
        ]
      );
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Could not perform action');
    }
  }

  const formatCurrencyValue = (value: string | number | null | undefined) => {
    if (value === null || value === undefined || value === '') return '';
    const numeric = Number(String(value).replace(/[^0-9.-]/g, ''));
    if (Number.isNaN(numeric)) return '';
    return numeric.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const normalizeCurrencyInput = (value: string) => {
    const cleaned = value.replace(/[^0-9.]/g, '');
    const [whole, fraction] = cleaned.split('.');
    if (fraction === undefined) return whole;
    return `${whole}.${fraction.slice(0, 2)}`;
  };

  const parseCurrencyInput = (value: string) => {
    const normalized = normalizeCurrencyInput(value);
    return normalized ? Number(normalized) : 0;
  };

  const debouncedAutoSave = (formData: any) => {
    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current);
    }
    setAutoSaveStatus('saving');
    autoSaveTimeoutRef.current = setTimeout(async () => {
      try {
        await api.patch(`/sessions/${id}/planning`, formData);
        setAutoSaveStatus('saved');
        setTimeout(() => setAutoSaveStatus('idle'), 2000);
      } catch (e: any) {
        setAutoSaveStatus('idle');
        console.error('Auto-save failed:', e?.message);
      }
    }, 1500); // Save after 1.5 seconds of inactivity
  };

  const handlePlanningChange = (field: string, value: string) => {
    const updatedForm = { ...planningForm, [field]: value };
    setPlanningForm(updatedForm);
    const payload = {
      funeralDate: updatedForm.funeralDate || null,
      venue: updatedForm.venue || null,
      burialLocation: updatedForm.burialLocation || null,
      accommodationInfo: updatedForm.accommodationInfo || null,
      familyRepresentatives: updatedForm.familyRepresentatives || null,
      keyContacts: updatedForm.keyContacts || null,
      culturalPractices: updatedForm.culturalPractices || null,
      noOfGuests: updatedForm.noOfGuests ? Number(updatedForm.noOfGuests) : null,
      mortuaryArrangements: updatedForm.mortuaryArrangements || null,
    };
    debouncedAutoSave(payload);
  };

  async function completeFuneral() {
    Alert.alert(
      'Complete Funeral?',
      'This will mark the funeral session as completed and send a summary to the family member. Are you sure?',
      [
        { text: 'Cancel', onPress: () => {}, style: 'cancel' },
        {
          text: 'Complete Funeral',
          onPress: async () => {
            try {
              setCompletingSession(true);
              const { data } = await api.post(`/sessions/${id}/complete`, {});
              Alert.alert('Success', 'Funeral marked as completed and summary sent to family member.');
              setSession((prev: any) => ({ ...prev, status: 'COMPLETED' }));
              setTimeout(() => navigation.goBack(), 1500);
            } catch (error: any) {
              Alert.alert('Error', error?.message || 'Could not complete funeral');
            } finally {
              setCompletingSession(false);
            }
          },
          style: 'destructive',
        },
      ]
    );
  }

  async function handleArchiveSession() {
    Alert.alert(
      'Archive Session',
      'This will archive the session and remove it from active lists. You can still delete archived sessions. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Archive', style: 'destructive', onPress: async () => {
          try {
            const { data } = await api.patch(`/sessions/${id}/archive`);
            setSession(data);
            Alert.alert('Archived', 'Session has been archived');
            setTimeout(() => navigation.goBack(), 800);
          } catch (e: any) {
            Alert.alert('Error', e?.response?.data?.message || e?.message || 'Could not archive session');
          }
        } }
      ]
    );
  }

  async function handleDeleteSession() {
    Alert.alert(
      'Delete Session',
      'This will permanently delete the session and all related data. This action cannot be undone. Are you sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: async () => {
          try {
            await api.delete(`/sessions/${id}`);
            Alert.alert('Deleted', 'Session has been deleted');
            setTimeout(() => navigation.goBack(), 600);
          } catch (e: any) {
            Alert.alert('Error', e?.response?.data?.message || e?.message || 'Could not delete session');
          }
        } }
      ]
    );
  }

  useEffect(() => {
    loadSession();
  }, [id]);

  useEffect(() => {
    if (collectorParam?.collectorName) {
      setActiveTab('donations');
    }
  }, [collectorParam]);

  async function loadSessionCollectors(sessionId: string) {
    setCollectorsLoading(true);
    try {
      const { data } = await api.get(`/sessions/${sessionId}/collectors`);
      setSessionCollectors(Array.isArray(data) ? data : []);
    } catch (e: any) {
      console.error('Could not load collectors', e?.message || e);
    } finally {
      setCollectorsLoading(false);
    }
  }

  async function loadDonationRequests(sessionId: string) {
    setDonationRequestsLoading(true);
    try {
      const { data } = await api.get(`/sessions/${sessionId}/donation-requests`);
      setDonationRequests(Array.isArray(data) ? data : []);
    } catch (e: any) {
      console.error('Could not load donation edit requests', e?.message || e);
    } finally {
      setDonationRequestsLoading(false);
    }
  }

  async function saveCollectorCount() {
    if (!collectorCount.trim()) {
      return Alert.alert('Collector limit', 'Enter a collector count or clear the field.');
    }
    try {
      const value = Number(collectorCount);
      if (Number.isNaN(value) || value < 1) {
        return Alert.alert('Collector limit', 'Collector count must be a positive number.');
      }
      await api.patch(`/sessions/${id}`, { sessionMeta: { collector_count: value } });
      Alert.alert('Saved', `Collector limit set to ${value}`);
      if (isOrganizer) {
        loadSessionCollectors(id);
      }
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Could not save collector limit');
    }
  }

  async function approveCollector(collectorIdentifier: string) {
    try {
      const { data } = await api.patch(`/sessions/${id}/collectors/${encodeURIComponent(collectorIdentifier)}/approve`);
      setSessionCollectors(prev => prev.map(c => (c.collector_identifier === collectorIdentifier ? data : c)));
      Alert.alert('Collector Approved', `${data.collector_name || collectorIdentifier} has been approved.`);
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Could not approve collector');
    }
  }

  async function rejectCollector(collectorIdentifier: string) {
    try {
      const { data } = await api.patch(`/sessions/${id}/collectors/${encodeURIComponent(collectorIdentifier)}/reject`, { reason: 'Rejected by organizer' });
      setSessionCollectors(prev => prev.map(c => (c.collector_identifier === collectorIdentifier ? data : c)));
      Alert.alert('Collector Rejected', `${data.collector_name || collectorIdentifier} has been rejected.`);
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Could not reject collector');
    }
  }

  async function approveRequest(donationId: string, requestId: string) {
    try {
      const { data } = await api.patch(`/donations/${encodeURIComponent(donationId)}/requests/${encodeURIComponent(requestId)}/approve`);
      setDonationRequests(prev => prev.map(r => (r.id === requestId ? data : r)));
      Alert.alert('Approved', 'Donation edit request approved.');
    } catch (e: any) {
      Alert.alert('Error', e?.response?.data?.message || e?.message || 'Could not approve request');
    }
  }

  async function rejectRequest(donationId: string, requestId: string) {
    try {
      const { data } = await api.patch(`/donations/${encodeURIComponent(donationId)}/requests/${encodeURIComponent(requestId)}/reject`, { reason: 'Rejected by organizer' });
      setDonationRequests(prev => prev.map(r => (r.id === requestId ? data : r)));
      Alert.alert('Rejected', 'Donation edit request rejected.');
    } catch (e: any) {
      Alert.alert('Error', e?.response?.data?.message || e?.message || 'Could not reject request');
    }
  }

  async function addRelative() {
    if (!relativeName.trim() || !relativeRelationship.trim()) {
      return Alert.alert('Required fields', 'Please enter both name and relationship.');
    }
    try {
      const newRelative = {
        id: `relative_${Date.now()}`,
        name: relativeName.trim(),
        relationship: relativeRelationship.trim(),
      };
      const updatedRelatives = [...relatives, newRelative];
      setRelatives(updatedRelatives);
      await api.patch(`/sessions/${id}`, { sessionMeta: { relatives: updatedRelatives } });
      setRelativeName('');
      setRelativeRelationship('');
      Alert.alert('Success', 'Relative added successfully');
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Could not add relative');
    }
  }

  async function removeRelative(relativeId: string) {
    try {
      const updatedRelatives = relatives.filter(r => r.id !== relativeId);
      setRelatives(updatedRelatives);
      await api.patch(`/sessions/${id}`, { sessionMeta: { relatives: updatedRelatives } });
      Alert.alert('Removed', 'Relative removed successfully');
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Could not remove relative');
    }
  }

  async function addChecklist() {
    if (!newChecklist.trim()) return;
    try {
      const { data } = await api.post(`/sessions/${id}/checklists`, { title: newChecklist });
      setChecklists(prev => [data, ...prev]);
      setNewChecklist('');
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Could not add checklist item');
    }
  }

  async function toggleChecklistItem(checklistId: string, completed: boolean) {
    try {
      const { data } = await api.patch(`/checklists/${checklistId}`, { completed: !completed });
      setChecklists(prev => prev.map(c => c.id === checklistId ? data : c));
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Could not update checklist');
    }
  }

  async function addTimeline() {
    if (!newItem.trim()) return;
    try {
      const { data } = await api.post(`/sessions/${id}/timelines`, { description: newItem, date: new Date().toISOString().split('T')[0] });
      setTimelines(prev => [data, ...prev]);
      setNewItem('');
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Could not add timeline');
    }
  }

  async function addDonation() {
    if (!donorName.trim() || !donationAmount.trim()) {
      Alert.alert('Required', 'Enter donor name and amount');
      return;
    }
    try {
      setDonationLoading(true);
      const now = new Date().toISOString();
      const payload: any = {
        donorName: donorName.trim(),
        amount: Number(donationAmount),
        paid: donationPaid,
        donorPhone: donorPhone.trim() || null,
        checkedInAt: now,
        notes: donationNotes.trim() || null,
      };
      if (collectorParam?.collectorName) payload.collectorName = collectorParam.collectorName;
      if (collectorParam?.collectorIdentifier) payload.collectorIdentifier = collectorParam.collectorIdentifier;
      const donationPath = collectorParam?.collectorIdentifier
        ? `/public/sessions/${id}/donations?organizerIdentifier=${encodeURIComponent(String(collectorParam.collectorIdentifier).trim().toUpperCase())}${collectorParam.collectorName ? `&collectorName=${encodeURIComponent(collectorParam.collectorName)}` : ''}`
        : `/sessions/${id}/donations`;
      const { data } = await api.post(donationPath, payload);
      setDonations(prev => [data, ...prev]);
      setDonorName('');
      setDonorPhone('');
      setDonationAmount('');
      setDonationNotes('');
      setDonationPaid(false);
      Alert.alert(
        'Donation recorded',
        'Donation has been saved. Do you want to print a receipt?',
        [
          { text: 'No', style: 'cancel' },
          { text: 'Yes', onPress: () => Alert.alert('Receipt', 'Receipt ready to print from your organizer dashboard.') },
        ]
      );
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Could not save donation');
    } finally {
      setDonationLoading(false);
    }
  }

  async function toggleDonationPaid(donationId: string, paid: boolean) {
    try {
      const { data } = await api.patch(`/donations/${donationId}`, { paid: !paid });
      setDonations(prev => prev.map((item) => (item.id === donationId ? data : item)));
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Could not update donation status');
    }
  }

  async function toggleDonationApproval(donationId: string, approved: boolean) {
    try {
      const { data } = await api.patch(`/donations/${donationId}`, { approved: !approved, approvalNotes: !approved ? 'Approved by organizer' : null });
      setDonations(prev => prev.map((item) => (item.id === donationId ? data : item)));
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Could not update approval status');
    }
  }

  // mobile-money request function removed

  async function addVolunteer() {
    if (!newItem.trim()) return;
    try {
      const { data } = await api.post(`/sessions/${id}/volunteers`, { name: newItem, role: 'Helper' });
      setVolunteers(prev => [data, ...prev]);
      setNewItem('');
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Could not add volunteer');
    }
  }

  async function addExpense() {
    if (!newItem.trim() || !newItemAmount.trim()) return;
    // Optimistically add expense so totals update immediately
    const tempId = `temp-${Date.now()}`;
    const tempExpense = { id: tempId, description: newItem.trim(), amount: Number(parseFloat(newItemAmount) || 0) };
    setExpenses(prev => [tempExpense, ...prev]);
    setNewItem('');
    setNewItemAmount('');
    try {
      const { data } = await api.post(`/sessions/${id}/expenses`, { description: tempExpense.description, amount: tempExpense.amount });
      // Replace temp with server record
      setExpenses(prev => prev.map((e) => (e.id === tempId ? data : e)));
    } catch (e: any) {
      // Remove temp and report error
      setExpenses(prev => prev.filter((e) => e.id !== tempId));
      Alert.alert('Error', e?.message || 'Could not add expense');
    }
  }

  async function addNote() {
    if (!newItem.trim()) return;
    try {
      const { data } = await api.post(`/sessions/${id}/notes`, { content: newItem });
      setNotes(prev => [data, ...prev]);
      setNewItem('');
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Could not add note');
    }
  }

  async function savePlanning(payload: any) {
    try {
      // Prevent budget updates from being saved from the UI
      const payloadToSend = { ...payload };
      if (payloadToSend.hasOwnProperty('budgetFinal')) delete payloadToSend.budgetFinal;
      const { data } = await api.patch(`/sessions/${id}/planning`, payloadToSend);
      setPlanning(data || payload);
      Alert.alert('Saved', 'Planning saved');
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Could not save planning');
    }
  }

  async function saveOneWeek(payload: any) {
    try {
      const { data } = await api.patch(`/sessions/${id}/one-week`, payload);
      setOneWeek(data || payload);
      Alert.alert('Saved', 'One-week observation saved');
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Could not save one-week observation');
    }
  }

  async function savePreparations(payload: any) {
    try {
      const { data } = await api.patch(`/sessions/${id}/preparations`, payload);
      setPreparations(data || payload);
      Alert.alert('Saved', 'Preparations saved');
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Could not save preparations');
    }
  }

  const isFamilyMember = user?.role === 'FAMILY_MEMBER';
  const isCompleted = session?.status === 'COMPLETED';
  const canCompleteSession = user?.role !== 'FAMILY_MEMBER';
  const donationTotal = useMemo(() => donations.reduce((sum, d) => sum + Number(d.amount || 0), 0), [donations]);

  const collectors = useMemo(() => {
    const setNames = new Set<string>();
    donations.forEach(d => { if (d.collector_name) setNames.add(d.collector_name); });
    return Array.from(setNames);
  }, [donations]);

  const donationCountByCollector = useMemo(() => {
    const counts: Record<string, number> = {};
    donations.forEach(d => {
      if (d.collector_name) {
        counts[d.collector_name] = (counts[d.collector_name] || 0) + 1;
      }
    });
    return counts;
  }, [donations]);

  const topDonations = useMemo(() => {
    const filtered = selectedCollector ? donations.filter(d => d.collector_name === selectedCollector) : donations;
    return filtered
      .slice()
      .sort((a, b) => Number(b.amount || 0) - Number(a.amount || 0))
      .slice(0, 10);
  }, [donations, selectedCollector]);

  const renderPlanning = () => {
    const { funeralDate: fd, budgetFinal: bd, venue: vn, burialLocation: bl, accommodationInfo: acc, familyRepresentatives: fr, keyContacts: kc, culturalPractices: cp, noOfGuests: ng, mortuaryArrangements: ma } = planningForm;
    const requestSnapshot = session?.session_meta?.request_snapshot || null;
    const selectedServices = Array.isArray(requestSnapshot?.selected_services) ? requestSnapshot.selected_services : [];
    const calculatedTotalFromRequest = requestSnapshot?.calculated_total ?? requestSnapshot?.calculatedTotal ?? null;
    const expensesTotal = expenses.reduce((s, e) => s + Number(e.amount || 0), 0);
    const statusColor = autoSaveStatus === 'saved' ? '#10b981' : autoSaveStatus === 'saving' ? '#f59e0b' : '#94a3b8';
    const statusText = autoSaveStatus === 'saved' ? '✓ Saved' : autoSaveStatus === 'saving' ? '⟳ Saving...' : '';
    
    return (
      <ScrollView refreshControl={<RefreshControl refreshing={loading} onRefresh={loadSession} />}>
        <View style={styles.section}>
          <View style={styles.planningHeader}>
            <View>
              <Text style={styles.sectionTitle}>Funeral Planning</Text>
              <Text style={styles.subtitle}>Plan all details for the funeral ceremony</Text>
            </View>
            {statusText && <Text style={[styles.autoSaveStatus, { color: statusColor }]}>{statusText}</Text>}
          </View>

          <View style={styles.planningGrid}>
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Funeral Date</Text>
              <TextInput 
                value={String(fd)} 
                onChangeText={(v) => handlePlanningChange('funeralDate', v)} 
                placeholder="YYYY-MM-DD" 
                style={styles.input} 
              />
            </View>

            <View style={styles.fieldGroup}>
              {/* Budget editing removed: display-only via overview */}
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Expected Number of Guests</Text>
              <TextInput 
                value={String(ng)} 
                onChangeText={(v) => handlePlanningChange('noOfGuests', v)} 
                keyboardType="number-pad" 
                style={styles.input} 
              />
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Ceremony Venue</Text>
              <TextInput 
                value={String(vn)} 
                onChangeText={(v) => handlePlanningChange('venue', v)} 
                placeholder="e.g., Community Center, Church" 
                style={styles.input} 
              />
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Burial Location</Text>
              <TextInput 
                value={String(bl)} 
                onChangeText={(v) => handlePlanningChange('burialLocation', v)} 
                placeholder="Hometown or cemetery" 
                style={styles.input} 
              />
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Mortuary Arrangements</Text>
              <TextInput 
                value={String(ma)} 
                onChangeText={(v) => handlePlanningChange('mortuaryArrangements', v)} 
                placeholder="Transport, storage details" 
                style={[styles.input, { height: 60 }]} 
                multiline 
              />
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Family Representatives</Text>
              <TextInput 
                value={String(fr)} 
                onChangeText={(v) => handlePlanningChange('familyRepresentatives', v)} 
                placeholder="Names and roles" 
                style={[styles.input, { height: 60 }]} 
                multiline 
              />
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Key Contacts</Text>
              <TextInput 
                value={String(kc)} 
                onChangeText={(v) => handlePlanningChange('keyContacts', v)} 
                placeholder="Important phone numbers and contacts" 
                style={[styles.input, { height: 60 }]} 
                multiline 
              />
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Accommodation Info</Text>
              <TextInput 
                value={String(acc)} 
                onChangeText={(v) => handlePlanningChange('accommodationInfo', v)} 
                placeholder="Lodging arrangements for guests" 
                style={[styles.input, { height: 60 }]} 
                multiline 
              />
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Cultural Practices & Traditions</Text>
              <TextInput 
                value={String(cp)} 
                onChangeText={(v) => handlePlanningChange('culturalPractices', v)} 
                placeholder="Special ceremonies, rituals, or traditions" 
                style={[styles.input, { height: 80 }]} 
                multiline 
              />
            </View>
          </View>

          {/* Complete Funeral button removed temporarily */}
        </View>
      </ScrollView>
    );
  };

  const renderOverview = () => {
    const completedChecklistCount = checklists.filter((item) => item.completed).length;
    const openChecklistCount = checklists.length - completedChecklistCount;
    const totalDonations = donations.reduce((sum, d) => sum + Number(d.amount || 0), 0);
    const donationCount = donations.length;
    const requestTotal = session?.session_meta?.request_snapshot?.calculated_total ?? session?.session_meta?.request_snapshot?.calculatedTotal ?? null;
    const expensesTotal = expenses.reduce((sum, e) => sum + Number(e.amount || 0), 0);
    const remainingFromRequest = requestTotal !== null && requestTotal !== undefined
      ? Number(requestTotal) - expensesTotal
      : null;

    return (
      <ScrollView refreshControl={<RefreshControl refreshing={loading} onRefresh={loadSession} />}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Session Overview</Text>
          <Text style={styles.subtitle}>Review the session summary, planning details, and family-ready completion action.</Text>

          <Card style={styles.sectionCard}>
            <Text style={styles.sectionSubtitle}>Session Summary</Text>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Deceased</Text>
              <Text style={styles.infoValue}>{session?.deceased_full_name || 'N/A'}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Status</Text>
              <Text style={styles.infoValue}>{session?.status || 'N/A'}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Session Code</Text>
              <Text style={styles.infoValue}>{session?.session_code || id}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Funeral Date</Text>
              <Text style={styles.infoValue}>{planning?.funeral_date || planningForm.funeralDate || 'Not set'}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Venue</Text>
              <Text style={styles.infoValue}>{planning?.venue || planningForm.venue || 'Not set'}</Text>
            </View>
          </Card>

          <Card style={styles.sectionCard}>
            <Text style={styles.sectionSubtitle}>Planning Details</Text>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Estimated Guests</Text>
              <Text style={styles.infoValue}>{(planning?.no_of_guests ?? planningForm.noOfGuests) || 'Not set'}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Request Total</Text>
              <Text style={styles.infoValue}>{requestTotal ? `₵${Number(requestTotal).toLocaleString()}` : 'N/A'}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Expenses Total</Text>
              <Text style={styles.infoValue}>₵{formatCurrencyValue(expensesTotal)}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Remaining</Text>
              <Text style={styles.infoValue}>{remainingFromRequest !== null ? `₵${formatCurrencyValue(remainingFromRequest)}` : 'N/A'}</Text>
            </View>
          </Card>

          <Card style={styles.sectionCard}>
            <Text style={styles.sectionSubtitle}>Progress Overview</Text>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Checklist</Text>
              <Text style={styles.infoValue}>{completedChecklistCount} completed / {checklists.length}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Donations</Text>
              <Text style={styles.infoValue}>{donationCount} donations • ₵{formatCurrencyValue(totalDonations)}</Text>
            </View>
          </Card>

          <Card style={styles.sectionCard}>
            <Text style={styles.sectionSubtitle}>Complete Planning</Text>
            <Text style={[styles.subtitle, { marginBottom: 16 }]}>Completing this session will send the family overview and lock the planning workflow.</Text>
            <View style={styles.actionRow}>
              <Button
                title={session?.status === 'COMPLETED' ? 'Session Already Completed' : 'Complete Planning & Send Overview'}
                onPress={handleCompleteSession}
                disabled={session?.status === 'COMPLETED' || completingSession}
                loading={completingSession}
                style={{ flex: 1 }}
              />
                {/* Archive and Delete actions removed per request */}
            </View>
          </Card>
        </View>
      </ScrollView>
    );
  };

  const addContribution = (item: { name: string; amount: number }) => {
    setOneWeekForm((p: any) => ({ ...p, contributions: [item, ...p.contributions] }));
  };

  const removeContribution = (index: number) => {
    setOneWeekForm((p: any) => ({ ...p, contributions: p.contributions.filter((_:any,i:number)=>i!==index) }));
  };

  const addCommittee = (item: { name: string; role: string }) => {
    setOneWeekForm((p: any) => ({ ...p, committees: [item, ...p.committees] }));
  };

  const removeCommittee = (index: number) => {
    setOneWeekForm((p: any) => ({ ...p, committees: p.committees.filter((_:any,i:number)=>i!==index) }));
  };

  const renderOneWeek = () => {
    const { announcement, contributions, committees } = oneWeekForm;
    return (
      <ScrollView refreshControl={<RefreshControl refreshing={loading} onRefresh={loadSession} />}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>One-Week Observation</Text>
          <Text style={styles.subtitle}>Death announcement, contributions, and committees</Text>

          <Text style={{fontWeight:'700',marginBottom:6}}>Death Announcement</Text>
          <TextInput value={announcement || ''} onChangeText={(v)=>{ setOneWeekForm((p:any)=>({...p,announcement:v})); }} style={styles.input} />

          <Text style={{fontWeight:'700',marginTop:12,marginBottom:6}}>Contributions</Text>
          <View style={styles.addRow}>
            <TextInput placeholder="Name" value={oneWeekInputs.contribName} onChangeText={(v)=>setOneWeekInputs(s=>({...s,contribName:v}))} style={[styles.input,{flex:1}]} />
            <TextInput placeholder="Amount" value={oneWeekInputs.contribAmount} keyboardType="decimal-pad" onChangeText={(v)=>setOneWeekInputs(s=>({...s,contribAmount:v}))} style={[styles.input,{width:120}]} />
            <Button title="Add" onPress={() => { if(!oneWeekInputs.contribName.trim()) return; addContribution({ name: oneWeekInputs.contribName.trim(), amount: Number(oneWeekInputs.contribAmount)||0 }); setOneWeekInputs(s=>({...s,contribName:'',contribAmount:''})); }} size="sm" />
          </View>
          {contributions.length===0 ? <Text style={styles.emptyText}>No contributions yet.</Text> : (
                  contributions.map((c:any,idx:number)=> (
                    <View key={idx} style={styles.checkItem}>
                      <View style={{flex:1}}>
                        <Text style={{fontWeight:'700'}}>{c.name}</Text>
                        <Text>₵{Number(c.amount).toLocaleString()}</Text>
                      </View>
                      <Button title="Remove" onPress={()=>removeContribution(idx)} />
                    </View>
                  ))
                )}

          <Text style={{fontWeight:'700',marginTop:12,marginBottom:6}}>Committees</Text>
          <View style={styles.addRow}>
            <TextInput placeholder="Name" value={oneWeekInputs.committeeName} onChangeText={(v)=>setOneWeekInputs(s=>({...s,committeeName:v}))} style={[styles.input,{flex:1}]} />
            <TextInput placeholder="Role" value={oneWeekInputs.committeeRole} onChangeText={(v)=>setOneWeekInputs(s=>({...s,committeeRole:v}))} style={[styles.input,{width:140}]} />
            <Button title="Add" onPress={() => { if(!oneWeekInputs.committeeName.trim()) return; addCommittee({ name: oneWeekInputs.committeeName.trim(), role: oneWeekInputs.committeeRole.trim()||'Member' }); setOneWeekInputs(s=>({...s,committeeName:'',committeeRole:''})); }} size="sm" />
          </View>
          {committees.length===0 ? <Text style={styles.emptyText}>No committees yet.</Text> : (
            committees.map((c:any,idx:number)=> (
              <View key={idx} style={styles.checkItem}>
                <View style={{flex:1}}>
                  <Text style={{fontWeight:'700'}}>{c.name}</Text>
                  <Text>{c.role}</Text>
                </View>
                <Button title="Remove" onPress={()=>removeCommittee(idx)} />
              </View>
            ))
          )}

          <Button title="Save One-Week" onPress={() => saveOneWeek({ announcement: oneWeekForm.announcement, contributions: oneWeekForm.contributions, committees: oneWeekForm.committees })} />
        </View>
      </ScrollView>
    );
  };

  const renderPreparations = () => {
    const { mortuary, printing, logistics, finance, religious_services } = preparationsForm;
    return (
      <ScrollView refreshControl={<RefreshControl refreshing={loading} onRefresh={loadSession} />}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Funeral Preparation</Text>
          <Text style={styles.subtitle}>Mortuary, printing, logistics, finance, religious services</Text>

          <Text style={{fontWeight:'700',marginBottom:6}}>Mortuary</Text>
          <TextInput value={mortuary} onChangeText={(v)=>setPreparationsForm((p:any)=>({...p,mortuary:v}))} style={[styles.input,{height:80}]} multiline />

          <Text style={{fontWeight:'700',marginTop:12,marginBottom:6}}>Printing</Text>
          <TextInput value={printing} onChangeText={(v)=>setPreparationsForm((p:any)=>({...p,printing:v}))} style={[styles.input,{height:80}]} multiline />

          <Text style={{fontWeight:'700',marginTop:12,marginBottom:6}}>Logistics</Text>
          <TextInput value={logistics} onChangeText={(v)=>setPreparationsForm((p:any)=>({...p,logistics:v}))} style={[styles.input,{height:80}]} multiline />

          <Text style={{fontWeight:'700',marginTop:12,marginBottom:6}}>Finance Notes</Text>
          <TextInput value={finance} keyboardType="decimal-pad" onChangeText={(v)=>setPreparationsForm((p:any)=>({...p,finance:v}))} style={styles.input} />

          <Text style={{fontWeight:'700',marginTop:12,marginBottom:6}}>Religious Services</Text>
          <TextInput value={religious_services} onChangeText={(v)=>setPreparationsForm((p:any)=>({...p,religious_services:v}))} style={styles.input} />

          <Button title="Save Preparations" onPress={() => savePreparations({ mortuary, printing, logistics, finance, religious_services })} />
        </View>
      </ScrollView>
    );
  };

  const renderChecklists = () => (
    <ScrollView refreshControl={<RefreshControl refreshing={loading} onRefresh={loadSession} />}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Planning Checklist</Text>
        <Text style={styles.subtitle}>Track all planning tasks for the funeral</Text>
        
        <View style={styles.addRow}>
          <TextInput
            value={newChecklist}
            onChangeText={setNewChecklist}
            placeholder="Add new task..."
            style={styles.input}
          />
          <Button title="Add" onPress={addChecklist} size="md" />
        </View>

          <FlatList
          scrollEnabled={false}
          data={checklists}
          keyExtractor={(item) => String(item.id)}
          renderItem={({ item }) => (
            <SafePressable onPress={() => toggleChecklistItem(item.id, item.completed)} style={styles.checkItem}>
              <View style={[styles.checkbox, item.completed && styles.checkboxChecked]}>
                {item.completed && <Text style={styles.checkmark}>✓</Text>}
              </View>
              <Text style={[styles.checkText, item.completed && styles.checkTextCompleted]}>{item.title}</Text>
            </SafePressable>
          )}
          ListEmptyComponent={<Text style={styles.emptyText}>No checklist items yet. Add one to get started.</Text>}
        />
      </View>
    </ScrollView>
  );

  const renderTimeline = () => (
    <ScrollView refreshControl={<RefreshControl refreshing={loading} onRefresh={loadSession} />}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Event Timeline</Text>
        <Text style={styles.subtitle}>Schedule key events and milestones</Text>
        
        <View style={styles.addRow}>
          <TextInput
            value={newItem}
            onChangeText={setNewItem}
            placeholder="Add event or date..."
            style={styles.input}
          />
          <Button title="Add" onPress={addTimeline} size="md" />
        </View>

        <FlatList
          scrollEnabled={false}
          data={timelines}
          keyExtractor={(item) => String(item.id)}
          renderItem={({ item }) => (
            <Card style={styles.timelineItem}>
              <Text style={styles.timelineDate}>{item.date ? new Date(item.date).toLocaleDateString() : 'No date'}</Text>
              <Text style={styles.timelineText}>{item.description}</Text>
            </Card>
          )}
          ListEmptyComponent={<Text style={styles.emptyText}>No timeline events yet.</Text>}
        />
      </View>
    </ScrollView>
  );

  const renderVolunteers = () => (
    <ScrollView refreshControl={<RefreshControl refreshing={loading} onRefresh={loadSession} />}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Volunteers & Team</Text>
        <Text style={styles.subtitle}>Manage people helping with the funeral</Text>
        
        <View style={styles.addRow}>
          <TextInput
            value={newItem}
            onChangeText={setNewItem}
            placeholder="Add volunteer name..."
            style={styles.input}
          />
          <Button title="Add" onPress={addVolunteer} size="md" />
        </View>

        <FlatList
          scrollEnabled={false}
          data={volunteers}
          keyExtractor={(item) => String(item.id)}
          renderItem={({ item }) => (
            <Card style={styles.volunteerItem}>
              <Text style={styles.volunteerName}>{item.name}</Text>
              <Text style={styles.volunteerRole}>{item.role}</Text>
            </Card>
          )}
          ListEmptyComponent={<Text style={styles.emptyText}>No volunteers assigned yet.</Text>}
        />
      </View>
    </ScrollView>
  );

  const renderExpenses = () => {
    const total = expenses.reduce((sum, e) => sum + (parseFloat(e.amount) || 0), 0);
    return (
      <ScrollView refreshControl={<RefreshControl refreshing={loading} onRefresh={loadSession} />}>
        <View style={styles.section}>
          {/* Budget & Expenses title/subtitle removed */}
          
          {/* Expenses summary */}
          <View style={styles.budgetCard}>
            <Text style={styles.sectionTitle}>Expenses</Text>
            <Text style={[styles.sectionSubtitle, { marginTop: 12 }]}>Selected Services</Text>
            {session?.session_meta?.request_snapshot && Array.isArray(session.session_meta.request_snapshot.selected_services) && session.session_meta.request_snapshot.selected_services.length > 0 ? (
              session.session_meta.request_snapshot.selected_services.map((s: any) => (
                <Text key={s.id || s.name} style={styles.infoValue}>• {s.name} ({s.category || s.category_name || 'Service'})</Text>
              ))
            ) : (
              <Text style={styles.helperText}>No services recorded from the request.</Text>
            )}
            <Text style={[styles.sectionSubtitle, { marginTop: 12 }]}>Request Estimated Total</Text>
            <Text style={styles.infoValue}>{session?.session_meta?.request_snapshot?.calculated_total ? `₵${Number(session.session_meta.request_snapshot.calculated_total).toLocaleString()}` : 'N/A'}</Text>
            <Text style={[styles.sectionSubtitle, { marginTop: 12 }]}>Expenses</Text>
            {expenses.length === 0 ? (
              <Text style={styles.helperText}>No expenses recorded yet.</Text>
            ) : (
              expenses.map((ex) => (
                <Text key={ex.id} style={styles.infoValue}>• {ex.title || ex.description}: ₵{Number(ex.amount || 0).toLocaleString()}</Text>
              ))
            )}
            <Text style={[styles.sectionSubtitle, { marginTop: 12 }]}>Expenses Total</Text>
            <Text style={styles.infoValue}>₵{total.toLocaleString()}</Text>
          </View>

          <Card style={styles.totalCard}>
            <Text style={styles.totalLabel}>Total Expenses</Text>
            <Text style={styles.totalAmount}>₵{total.toLocaleString()}</Text>
          </Card>

          <View style={styles.expenseInputRow}>
            <TextInput
              value={newItem}
              onChangeText={setNewItem}
              placeholder="Item description..."
              style={[styles.input, { flex: 2 }]}
            />
            <TextInput
              value={newItemAmount}
              onChangeText={setNewItemAmount}
              placeholder="Amount"
              keyboardType="decimal-pad"
              style={[styles.input, { flex: 1 }]}
            />
          </View>
          <Button title="Add Expense" onPress={addExpense} style={styles.addButton} />

          <FlatList
            scrollEnabled={false}
            data={expenses}
            keyExtractor={(item) => String(item.id)}
            renderItem={({ item }) => (
              <View style={styles.expenseItem}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.expenseDesc}>{item.description}</Text>
                </View>
                <Text style={styles.expenseAmount}>₵{parseFloat(item.amount).toLocaleString()}</Text>
              </View>
            )}
            ListEmptyComponent={<Text style={styles.emptyText}>No expenses logged yet.</Text>}
          />
        </View>
      </ScrollView>
    );
  };

  const renderDonations = () => (
    <ScrollView refreshControl={<RefreshControl refreshing={loading} onRefresh={loadSession} />}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Donations</Text>
        <Text style={styles.subtitle}>Choose whether to record a donation or review donation history.</Text>

        <Card style={styles.sessionCard}>
          <Text style={styles.sectionTitle}>Session</Text>
          <View style={styles.sessionMeta}>
            <Text style={styles.sessionMetaText}>Deceased: {session?.deceased_full_name || 'N/A'}</Text>
            <Text style={styles.sessionMetaText}>Status: {session?.status || 'N/A'}</Text>
            <Text style={styles.sessionMetaText}>Session code: {session?.session_code || id}</Text>
          </View>
        </Card>

        {isOrganizerAssistView && collectorParam?.collectorIdentifier && approvalStatus === 'pending' && (
          <View style={{ backgroundColor: '#fff3cd', padding: 12, borderRadius: 8, marginVertical: 12, borderLeftWidth: 4, borderLeftColor: '#ffc107' }}>
            <Text style={{ color: '#856404', fontWeight: '600', marginBottom: 4 }}>⏳ Awaiting Organizer Approval</Text>
            <Text style={{ color: '#856404', fontSize: 13 }}>Your access to record donations is awaiting approval from the organizer. Please check back shortly or contact the organizer for assistance.</Text>
          </View>
        )}

        {isOrganizerAssistView && collectorParam?.collectorIdentifier ? (
          <View style={styles.profileButtonRow}>
            <Button
              title="Collector Profile"
              variant="secondary"
              size="sm"
              onPress={() => navigation.navigate('OrganizerAssistProfile', {
                id,
                collectorName: collectorParam?.collectorName || '',
                collectorIdentifier: collectorParam?.collectorIdentifier,
              })}
            />
          </View>
        ) : null}

        {user?.role === 'ORGANIZER' && (
          <View style={styles.collectorLimitRow}>
            <TextInput
              placeholder="Collector limit"
              value={collectorCount}
              onChangeText={setCollectorCount}
              keyboardType="number-pad"
              style={[styles.input, { flex: 1 }]}
            />
            <Button title="Save" onPress={saveCollectorCount} size="sm" style={{ marginLeft: 8 }} />
          </View>
        )}

        {isOrganizer && (
          <Card style={[styles.sectionCard, { marginBottom: 16 }]}> 
            <Text style={styles.sectionTitle}>Collector Access Requests</Text>
            <Text style={[styles.sectionSubtitle, { marginBottom: 12 }]}>Approve or reject collector requests for this session.</Text>
            {collectorsLoading ? (
              <Text style={styles.helperText}>Loading collectors...</Text>
            ) : sessionCollectors.length === 0 ? (
              <Text style={styles.helperText}>No collector access requests yet.</Text>
            ) : (
              sessionCollectors.map((collector) => (
                <View key={collector.collector_identifier || collector.collector_name} style={styles.collectorRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.infoValue}>{collector.collector_name || collector.collector_identifier}</Text>
                    <Text style={styles.helperText}>{collector.approved ? 'Approved' : collector.rejected_at ? 'Rejected' : 'Pending approval'}</Text>
                  </View>
                  {!collector.approved && !collector.rejected_at ? (
                    <View style={styles.collectorActions}>
                      <Button title="Approve" size="sm" onPress={() => approveCollector(collector.collector_identifier)} />
                      <Button title="Reject" size="sm" variant="secondary" onPress={() => rejectCollector(collector.collector_identifier)} />
                    </View>
                  ) : null}
                </View>
              ))
            )}
          </Card>
        )}

        {isOrganizer && (
          <Card style={[styles.sectionCard, { marginBottom: 16 }]}> 
            <Text style={styles.sectionTitle}>Donation Edit Requests</Text>
            <Text style={[styles.sectionSubtitle, { marginBottom: 12 }]}>Approve or reject per-donation edit requests.</Text>
            {donationRequestsLoading ? (
              <Text style={styles.helperText}>Loading requests...</Text>
            ) : donationRequests.length === 0 ? (
              <Text style={styles.helperText}>No donation edit requests.</Text>
            ) : (
              donationRequests.map((req) => (
                <View key={req.id} style={styles.collectorRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.infoValue}>Donation #{req.donation_id} — {req.requester_collector_name || req.requester_user_name || 'Requester'}</Text>
                    <Text style={styles.helperText}>{req.status ? req.status.toUpperCase() : 'PENDING'} • {new Date(req.created_at).toLocaleString()}</Text>
                    {req.reason && <Text style={styles.helperText}>{req.reason}</Text>}
                  </View>
                  {req.status === 'PENDING' ? (
                    <View style={styles.collectorActions}>
                      <Button title="Approve" size="sm" onPress={() => approveRequest(req.donation_id, req.id)} />
                      <Button title="Reject" size="sm" variant="secondary" onPress={() => rejectRequest(req.donation_id, req.id)} />
                    </View>
                  ) : null}
                </View>
              ))
            )}
          </Card>
        )}

        <Card style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Donation Actions</Text>
          <Text style={[styles.sectionSubtitle, { marginBottom: 12 }]}>Use one of the screens below to keep donation entry and history in separate workflows.</Text>
          <Button
            title="Record Donation"
            onPress={() => navigation.navigate('DonationRecord', {
              id: session?.session_code || id,
              relatives,
              collectorName: collectorParam?.collectorName,
              collectorIdentifier: collectorParam?.collectorIdentifier,
            })}
            disabled={!session?.id || isCompleted}
            style={styles.actionButton}
          />
          <Button
            title="Donation History"
            onPress={() => navigation.navigate('DonationHistory', {
              id: session?.session_code || id,
              collectorName: collectorParam?.collectorName,
              collectorIdentifier: collectorParam?.collectorIdentifier,
            })}
            disabled={!session?.id}
            variant="secondary"
            style={styles.actionButton}
          />
          {isCompleted && (
            <Text style={[styles.sectionSubtitle, { color: '#6b7280', marginTop: 12 }]}>Donation recording is disabled for completed sessions. You may still view donation history.</Text>
          )}
        </Card>
      </View>
    </ScrollView>
  );

  const renderRelatives = () => (
    <ScrollView refreshControl={<RefreshControl refreshing={loading} onRefresh={loadSession} />}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Deceased Family Relatives</Text>
        <Text style={styles.subtitle}>Add relatives of the deceased to link donations</Text>
        
        <Card style={styles.formCard}>
          <Text style={styles.formLabel}>Relative Name</Text>
          <TextInput
            value={relativeName}
            onChangeText={setRelativeName}
            placeholder="Enter relative name"
            style={styles.formInput}
          />
          
          <Text style={styles.formLabel}>Relationship to Deceased</Text>
          <TextInput
            value={relativeRelationship}
            onChangeText={setRelativeRelationship}
            placeholder="e.g., Son, Daughter, Mother, Father"
            style={styles.formInput}
          />
          
          <Button title="Add Relative" onPress={addRelative} />
        </Card>

        <Text style={styles.sectionTitle}>Relatives</Text>
        <FlatList
          scrollEnabled={false}
          data={relatives}
          keyExtractor={(item) => String(item.id)}
          renderItem={({ item }) => (
            <Card style={styles.relativeItem}>
              <View style={styles.relativeHeader}>
                <View>
                  <Text style={styles.relativeName}>{item.name}</Text>
                  <Text style={styles.relativeRelationship}>{item.relationship}</Text>
                </View>
                <SafePressable onPress={() => removeRelative(item.id)}>
                  <Text style={styles.deleteButton}>Delete</Text>
                </SafePressable>
              </View>
            </Card>
          )}
          ListEmptyComponent={<Text style={styles.emptyText}>No relatives added yet.</Text>}
        />
      </View>
    </ScrollView>
  );

  const renderNotes = () => (
    <ScrollView refreshControl={<RefreshControl refreshing={loading} onRefresh={loadSession} />}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Communication Notes</Text>
        <Text style={styles.subtitle}>Keep track of important communications and updates</Text>
        
        <View style={styles.addNoteRow}>
          <TextInput
            value={newItem}
            onChangeText={setNewItem}
            placeholder="Add a note..."
            multiline
            numberOfLines={3}
            style={styles.noteInput}
          />
          <Button title="Save Note" onPress={addNote} />
        </View>

        <FlatList
          scrollEnabled={false}
          data={notes}
          keyExtractor={(item) => String(item.id)}
          renderItem={({ item }) => (
            <Card style={styles.noteItem}>
              <Text style={styles.noteDate}>{new Date(item.created_at).toLocaleDateString()} {new Date(item.created_at).toLocaleTimeString()}</Text>
              <Text style={styles.noteContent}>{item.content}</Text>
            </Card>
          )}
          ListEmptyComponent={<Text style={styles.emptyText}>No notes yet.</Text>}
        />
      </View>
    </ScrollView>
  );

  const tabs: { id: Tab; label: string }[] = isOrganizer
    ? [
      { id: 'donations', label: 'Donations' },
      { id: 'overview', label: 'Overview' },
      { id: 'checklists', label: 'Checklist' },
      { id: 'expenses', label: 'Expenses' },
      { id: 'relatives', label: 'Relatives' },
    ]
    : isOrganizerAssistView
      ? [{ id: 'donations', label: 'Donations' }]
      : [
        { id: 'overview', label: 'Overview' },
        { id: 'checklists', label: 'Checklist' },
        { id: 'expenses', label: 'Expenses' },
        { id: 'relatives', label: 'Relatives' },
      ];

  return (
    <Screen>
      <View style={styles.header}>
        {!isOrganizerAssistView && (
          <SafePressable onPress={() => navigation.goBack()}>
            <Text style={styles.backButton}>← Back</Text>
          </SafePressable>
        )}
        <Text style={styles.headerTitle}>{session?.deceased_full_name || 'Funeral Session'}</Text>
        <Text style={styles.headerCode}>{session?.session_code}</Text>
      </View>
      {session?.status === 'COMPLETED' ? (
        <>
            <View style={styles.completedContainer}>
              <Text style={styles.completedTitle}>✓ Funeral Session Completed</Text>
              <Text style={styles.completedMessage}>
                This funeral session has been completed and marked as done. Management features are disabled.
              </Text>
            </View>
        </>
      ) : (
        <>
          <View style={styles.tabsContainer}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabsList}>
              {tabs.map((tab) => (
                <SafePressable
                  key={tab.id}
                  onPress={() => setActiveTab(tab.id)}
                  style={({ pressed }: any) => [styles.tabButton, activeTab === tab.id && styles.tabButtonActive]}
                >
                  <Text style={[styles.tabLabel, activeTab === tab.id && styles.tabLabelActive]}>
                    {tab.label}
                  </Text>
                </SafePressable>
              ))}
            </ScrollView>
          </View>

          {/* Complete Funeral area removed temporarily */}

          <View style={styles.contentContainer}>
            {activeTab === 'overview' && renderOverview()}
            {activeTab === 'checklists' && renderChecklists()}
            {activeTab === 'expenses' && renderExpenses()}
            {activeTab === 'donations' && renderDonations()}
            {activeTab === 'relatives' && renderRelatives()}
          </View>
        </>
      )}
    </Screen>
  );
}

function InfoItem({ label, value }: { label: string; value?: any }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value || 'N/A'}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  budgetCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    padding: 12,
    marginBottom: 12,
  },
  backButton: {
    fontSize: 16,
    color: '#0284C7',
    fontWeight: '600',
    marginBottom: 8,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '900',
    color: '#111827',
    marginBottom: 4,
  },
  headerCode: {
    fontSize: 13,
    color: '#64748B',
  },
  tabsContainer: {
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  profileSection: {
    paddingHorizontal: 24,
    paddingVertical: 16,
    backgroundColor: '#F8FAFC',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  profileHeading: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  profileLabel: {
    fontSize: 12,
    color: '#475569',
    marginTop: 8,
  },
  profileValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
    marginTop: 4,
  },
  sessionActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 12,
    gap: 8,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  tabsList: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
  },
  tabButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
  },
  tabButtonActive: {
    backgroundColor: '#4338CA',
  },
  tabLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#64748B',
  },
  tabLabelActive: {
    color: '#fff',
  },
  contentContainer: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  section: {
    padding: 24,
    paddingBottom: 40,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#111827',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#64748B',
    marginBottom: 16,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#475569',
    fontWeight: '700',
  },
  helperText: {
    fontSize: 13,
    color: '#64748B',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  infoLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#475569',
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  profileButtonRow: {
    marginBottom: 16,
    alignItems: 'flex-start',
  },
  addRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
    alignItems: 'center',
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#fff',
    fontSize: 14,
  },
  checkItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    marginVertical: 6,
    borderRadius: 8,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  checkbox: {
    width: 24,
    height: 24,
    borderWidth: 2,
    borderColor: '#4338CA',
    borderRadius: 6,
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    backgroundColor: '#4338CA',
  },
  checkmark: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  },
  checkText: {
    flex: 1,
    fontSize: 15,
    color: '#111827',
    fontWeight: '500',
  },
  checkTextCompleted: {
    color: '#94A3B8',
    textDecorationLine: 'line-through',
  },
  emptyText: {
    fontSize: 14,
    color: '#94A3B8',
    fontStyle: 'italic',
    textAlign: 'center',
    marginVertical: 16,
  },
  timelineItem: {
    marginVertical: 8,
    padding: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#4338CA',
  },
  timelineDate: {
    fontSize: 12,
    fontWeight: '700',
    color: '#4338CA',
    marginBottom: 4,
  },
  timelineText: {
    fontSize: 14,
    color: '#111827',
    fontWeight: '500',
  },
  sessionCard: {
    marginBottom: 16,
    padding: 16,
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
  },
  sessionMeta: {
    marginTop: 8,
  },
  sessionMetaText: {
    color: '#475569',
    marginBottom: 4,
  },
  sectionCard: {
    padding: 16,
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    marginBottom: 16,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    marginTop: 8,
    justifyContent: 'space-between',
  },
  actionButton: {
    marginTop: 12,
  },
  volunteerItem: {
    marginVertical: 8,
    padding: 12,
  },
  volunteerName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  volunteerRole: {
    fontSize: 13,
    color: '#64748B',
  },
  totalCard: {
    backgroundColor: '#4338CA',
    marginBottom: 16,
    padding: 16,
  },
  totalLabel: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.8)',
    marginBottom: 4,
  },
  totalAmount: {
    fontSize: 28,
    fontWeight: '900',
    color: '#fff',
  },
  expenseInputRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
    alignItems: 'flex-end',
  },
  addButton: {
    marginBottom: 16,
  },
  expenseItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    marginVertical: 6,
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  expenseDesc: {
    fontSize: 14,
    color: '#111827',
    fontWeight: '500',
  },
  expenseAmount: {
    fontSize: 15,
    fontWeight: '700',
    color: '#059669',
  },
  addNoteRow: {
    marginBottom: 16,
  },
  noteInput: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#fff',
    fontSize: 14,
    marginBottom: 12,
  },
  noteItem: {
    marginVertical: 8,
    padding: 12,
  },
  noteDate: {
    fontSize: 12,
    color: '#94A3B8',
    marginBottom: 6,
  },
  noteContent: {
    fontSize: 14,
    color: '#111827',
    lineHeight: 20,
  },
  planningHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  planningGrid: {
    gap: 14,
    marginBottom: 20,
  },
  fieldGroup: {
    marginBottom: 4,
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
    color: '#475569',
    marginBottom: 6,
  },
  autoSaveStatus: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 8,
  },
  completeButton: {
    marginTop: 16,
    backgroundColor: '#10b981',
  },
  completeArea: {
    paddingHorizontal: 24,
    paddingBottom: 16,
    backgroundColor: '#F8FAFC',
  },
  dashboardButton: {
    alignSelf: 'flex-start',
    marginTop: 12,
  },
  totalCardLight: {
    backgroundColor: '#EFF6FF',
    marginBottom: 16,
    padding: 16,
  },
  totalAmountDark: {
    fontSize: 28,
    fontWeight: '900',
    color: '#1E40AF',
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  checkboxLabel: {
    fontSize: 14,
    color: '#475569',
    fontWeight: '700',
  },
  checkboxWrapper: {
    justifyContent: 'center',
  },
  collectorLimitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginVertical: 12,
  },
  collectorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    marginVertical: 6,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  collectorActions: {
    flexDirection: 'row',
    gap: 8,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 4,
  },
  summaryLabel: {
    fontSize: 14,
    color: '#334155',
    fontWeight: '700',
  },
  summaryValue: {
    fontSize: 14,
    color: '#0F172A',
    fontWeight: '800',
  },
  topDonationItem: {
    marginVertical: 4,
    padding: 12,
    backgroundColor: '#F8FAFC',
  },
  approvedTag: {
    marginTop: 6,
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: '#DCFCE7',
    color: '#166534',
    fontSize: 11,
    fontWeight: '800',
  },
  donationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 12,
    marginVertical: 6,
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  donationName: {
    fontSize: 15,
    color: '#111827',
    fontWeight: '700',
    marginBottom: 2,
  },
  donationMeta: {
    fontSize: 12,
    color: '#64748B',
  },
  donationRight: {
    alignItems: 'flex-end',
  },
  donationAmount: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  statusBadge: {
    marginTop: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
  },
  statusPaid: {
    backgroundColor: '#DCFCE7',
  },
  statusPending: {
    backgroundColor: '#FEF3C7',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1F2937',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#FEF2F2',
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: '900',
    color: '#991B1B',
    marginBottom: 12,
    textAlign: 'center',
  },
  errorMessage: {
    fontSize: 16,
    color: '#7F1D1D',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 24,
  },
  completedContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#DCFCE7',
  },
  completedTitle: {
    fontSize: 24,
    fontWeight: '900',
    color: '#15803D',
    marginBottom: 12,
    textAlign: 'center',
  },
  completedMessage: {
    fontSize: 16,
    color: '#166534',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 24,
  },
  formCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  formLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#475569',
    marginBottom: 8,
  },
  formInput: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#fff',
    fontSize: 14,
    marginBottom: 12,
    color: '#111827',
  },
  relativeItem: {
    backgroundColor: '#fff',
    borderRadius: 8,
    marginVertical: 8,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  relativeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  relativeName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  relativeRelationship: {
    fontSize: 13,
    color: '#64748B',
  },
  deleteButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#FEE2E2',
    borderRadius: 6,
  },
});
