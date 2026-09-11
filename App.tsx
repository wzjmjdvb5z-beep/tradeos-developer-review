import { useEffect, useState } from 'react';
import { ActivityIndicator, Button, SafeAreaView, Text, TextInput, View } from 'react-native';
import type { Session } from '@supabase/supabase-js';
import { supabase } from './src/lib/supabase';
import { createCompany, getMyMemberships, listJobs, type JobSummary, type Membership } from './src/lib/workspace';
import { canManageCompany, createJob } from './src/lib/operations';

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [activeMembership, setActiveMembership] = useState<Membership | null>(null);
  const [jobs, setJobs] = useState<JobSummary[]>([]);
  const [companyName, setCompanyName] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  const [jobAddress, setJobAddress] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session) {
      setMemberships([]);
      setActiveMembership(null);
      setJobs([]);
      return;
    }
    refreshWorkspace().catch((error) => setMessage(error.message));
  }, [session]);

  async function refreshWorkspace() {
    const nextMemberships = await getMyMemberships();
    setMemberships(nextMemberships);
    const selected = nextMemberships[0] ?? null;
    setActiveMembership(selected);
    setJobs(selected ? await listJobs(selected.companyId) : []);
  }

  async function signIn() {
    setMessage('');
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    if (error) setMessage(error.message);
  }

  async function signUp() {
    setMessage('');
    const { error } = await supabase.auth.signUp({ email: email.trim(), password });
    if (error) setMessage(error.message);
    else setMessage('Account created. Check email if confirmation is enabled.');
  }

  async function handleCreateCompany() {
    await createCompany(companyName);
    setCompanyName('');
    await refreshWorkspace();
  }

  async function handleCreateJob() {
    if (!activeMembership) return;
    await createJob(activeMembership.companyId, jobTitle, jobAddress);
    setJobTitle('');
    setJobAddress('');
    setJobs(await listJobs(activeMembership.companyId));
  }

  if (loading) return <SafeAreaView><ActivityIndicator /></SafeAreaView>;

  if (!session) {
    return (
      <SafeAreaView style={{ padding: 24, gap: 12 }}>
        <Text style={{ fontSize: 28, fontWeight: '700' }}>TradeOS</Text>
        <TextInput placeholder="Email" autoCapitalize="none" value={email} onChangeText={setEmail} style={{ borderWidth: 1, padding: 12 }} />
        <TextInput placeholder="Password" secureTextEntry value={password} onChangeText={setPassword} style={{ borderWidth: 1, padding: 12 }} />
        <Button title="Sign in" onPress={signIn} />
        <Button title="Create account" onPress={signUp} />
        {!!message && <Text>{message}</Text>}
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ padding: 24, gap: 12 }}>
      <Text style={{ fontSize: 28, fontWeight: '700' }}>TradeOS</Text>
      <Text>{session.user.email}</Text>

      {!activeMembership ? (
        <View style={{ gap: 8 }}>
          <Text>No workspace yet</Text>
          <TextInput placeholder="Company name" value={companyName} onChangeText={setCompanyName} style={{ borderWidth: 1, padding: 12 }} />
          <Button title="Create company" onPress={handleCreateCompany} />
        </View>
      ) : (
        <View style={{ gap: 8 }}>
          <Text>{activeMembership.companyName} · {activeMembership.role}</Text>
          {memberships.length > 1 && memberships.map((membership) => (
            <Button key={membership.companyId} title={membership.companyName} onPress={async () => {
              setActiveMembership(membership);
              setJobs(await listJobs(membership.companyId));
            }} />
          ))}

          {canManageCompany(activeMembership.role) && (
            <View style={{ gap: 8 }}>
              <TextInput placeholder="Job title" value={jobTitle} onChangeText={setJobTitle} style={{ borderWidth: 1, padding: 12 }} />
              <TextInput placeholder="Address" value={jobAddress} onChangeText={setJobAddress} style={{ borderWidth: 1, padding: 12 }} />
              <Button title="Create job" onPress={handleCreateJob} />
            </View>
          )}

          {jobs.map((job) => <Text key={job.id}>{job.title} · {job.status}</Text>)}
        </View>
      )}

      <Button title="Sign out" onPress={() => supabase.auth.signOut()} />
      {!!message && <Text>{message}</Text>}
    </SafeAreaView>
  );
}
