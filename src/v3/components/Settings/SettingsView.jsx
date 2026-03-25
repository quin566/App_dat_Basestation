import React, { useState, useEffect } from 'react';
import { useAppState } from '../../contexts/StateContext';
import { Settings, User, Mail, Key, Save, CheckCircle2, RefreshCw, Download, Compass, Link, AlertCircle, MessageSquare } from 'lucide-react';

const SettingsView = () => {
  const { state, updateState, setRunTour } = useAppState();
  const [saved, setSaved] = useState(false);
  const [gmailAddress, setGmailAddress] = useState(state.emailSettings?.address || '');
  const [gmailPass, setGmailPass] = useState(state.emailSettings?.appPassword || '');
  const [profileName, setProfileName] = useState(state.businessProfile?.name || 'Ariana');
  const [profileBiz, setProfileBiz] = useState(state.businessProfile?.businessName || 'The Love Lens by Ariana');
  const [profileState, setProfileState] = useState(state.businessProfile?.state || 'Arizona');
  const [revenueTarget, setRevenueTarget] = useState(state.revenueTarget || 100000);
  const [updateStatus, setUpdateStatus] = useState('idle'); // idle | checking | installing | up-to-date | error
  const [stripeKey, setStripeKey] = useState(state.stripeSecretKey || '');
  const [stripePubKey, setStripePubKey] = useState(state.stripePublishableKey || '');
  const [stripeTestStatus, setStripeTestStatus] = useState('idle'); // idle | testing | ok | error
  const [stripeTestError, setStripeTestError] = useState('');
  const [smsSid, setSmsSid] = useState(state.smsSettings?.accountSid || '');
  const [smsToken, setSmsToken] = useState(state.smsSettings?.authToken || '');
  const [smsFrom, setSmsFrom] = useState(state.smsSettings?.fromNumber || '');

  useEffect(() => {
    window.electronAPI?.onUpdateStatus?.((status) => setUpdateStatus(status));
  }, []);

  const handleCheckUpdate = async () => {
    setUpdateStatus('checking');
    const result = await window.electronAPI?.triggerGitUpdate?.();
    if (result?.status === 'up-to-date') setUpdateStatus('up-to-date');
    else if (result?.status === 'error') setUpdateStatus('error');
    else if (result?.status === 'unavailable') setUpdateStatus('unavailable');
    else setUpdateStatus('idle');
    // 'installing' is set by the onUpdateStatus listener; app relaunches before invoke resolves
  };

  const handleStripeTest = async () => {
    if (!stripeKey.trim()) return;
    setStripeTestStatus('testing');
    setStripeTestError('');
    updateState({ stripeSecretKey: stripeKey.trim(), stripePublishableKey: stripePubKey.trim() });
    // Small delay so state persists before IPC call reads it
    await new Promise(r => setTimeout(r, 600));
    const res = await window.electronAPI?.stripeTestKey?.();
    if (res?.success) {
      setStripeTestStatus('ok');
    } else {
      setStripeTestStatus('error');
      setStripeTestError(res?.error || 'Connection failed. Check your key.');
    }
  };

  const handleSave = () => {
    updateState({
      emailSettings: { address: gmailAddress, appPassword: gmailPass },
      businessProfile: { name: profileName, businessName: profileBiz, state: profileState },
      revenueTarget: Number(revenueTarget),
      stripeSecretKey: stripeKey.trim(),
      stripePublishableKey: stripePubKey.trim(),
      smsSettings: { accountSid: smsSid.trim(), authToken: smsToken.trim(), fromNumber: smsFrom.trim() },
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="p-10 max-w-3xl mx-auto space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-300">
      <header>
        <div className="flex items-center gap-3 text-[#9C8A7A] text-sm font-bold uppercase tracking-widest mb-2">
          <Settings size={14} /><span>Settings</span>
        </div>
        <h2 className="text-5xl font-black text-[#2C2511] tracking-tight">App Settings</h2>
        <p className="text-[#8A7A6A] mt-2 text-lg">Manage your profile and integrations.</p>
      </header>

      {/* Business Profile */}
      <section data-tour="settings-profile" className="bg-white rounded-3xl p-8 border border-[#E8E4E1] shadow-sm space-y-5">
        <h3 className="text-lg font-black flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-[#F2EFE9] flex items-center justify-center text-[#5F6F65]"><User size={18} /></div>
          Business Profile
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[
            { label: 'Your Name', value: profileName, set: setProfileName, placeholder: 'e.g. Ariana' },
            { label: 'Business Name', value: profileBiz, set: setProfileBiz, placeholder: 'e.g. The Love Lens' },
          ].map(({ label, value, set, placeholder }) => (
            <div key={label}>
              <label className="text-xs font-black uppercase tracking-wider text-[#8A7A6A] block mb-2">{label}</label>
              <input value={value} onChange={e => set(e.target.value)} placeholder={placeholder}
                className="w-full px-4 py-3 bg-[#FAF8F3] border border-[#E8E4E1] rounded-xl text-sm font-medium text-[#2C2511] focus:outline-none focus:ring-2 focus:ring-[#5F6F65]/30"
              />
            </div>
          ))}
        </div>
        <div>
          <label className="text-xs font-black uppercase tracking-wider text-[#8A7A6A] block mb-2">State of Operation</label>
          <select value={profileState} onChange={e => setProfileState(e.target.value)}
            className="w-full px-4 py-3 bg-[#FAF8F3] border border-[#E8E4E1] rounded-xl text-sm font-medium text-[#2C2511] focus:outline-none focus:ring-2 focus:ring-[#5F6F65]/30"
          >
            <option>Arizona</option>
            <option>California</option>
            <option>Nevada</option>
            <option>Texas</option>
            <option>Utah</option>
            <option>Other</option>
          </select>
        </div>
      </section>

      {/* Business Goals */}
      <section className="bg-white rounded-3xl p-8 border border-[#E8E4E1] shadow-sm space-y-5">
        <h3 className="text-lg font-black flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-[#F2EFE9] flex items-center justify-center text-[#5F6F65]"><RefreshCw size={18} /></div>
          Business Goals
        </h3>
        <div>
          <label className="text-xs font-black uppercase tracking-wider text-[#8A7A6A] block mb-2">Annual Net Profit Target</label>
          <div className="relative">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-[#9C8A7A] font-bold">$</div>
            <input type="number" value={revenueTarget} onChange={e => setRevenueTarget(e.target.value)} placeholder="100000"
              className="w-full pl-8 pr-4 py-3 bg-[#FAF8F3] border border-[#E8E4E1] rounded-xl text-sm font-medium text-[#2C2511] focus:outline-none focus:ring-2 focus:ring-[#5F6F65]/30"
            />
          </div>
          <p className="text-[10px] text-[#9C8A7A] mt-2 font-medium italic">
            This target will update your Dashboard "Net Profit" progress card.
          </p>
        </div>
      </section>

      {/* Gmail Integration */}
      <section className="bg-white rounded-3xl p-8 border border-[#E8E4E1] shadow-sm space-y-5">
        <h3 className="text-lg font-black flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-[#F2EFE9] flex items-center justify-center text-[#5F6F65]"><Mail size={18} /></div>
          Gmail Integration
        </h3>
        <p className="text-xs text-[#9C8A7A] leading-relaxed">
          Connect your Gmail account to read client inquiry threads and send template replies directly from the Email Ops tab.
          Use a <strong>Google App Password</strong> (not your regular password) — generated at{' '}
          <a href="#" className="text-[#5F6F65] underline">myaccount.google.com/apppasswords</a>.
        </p>
        <div className="space-y-4">
          <div>
            <label className="text-xs font-black uppercase tracking-wider text-[#8A7A6A] block mb-2">Gmail Address</label>
            <div className="relative">
              <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#9C8A7A]" />
              <input type="email" value={gmailAddress} onChange={e => setGmailAddress(e.target.value)}
                placeholder="youremail@gmail.com"
                className="w-full pl-11 pr-4 py-3 bg-[#FAF8F3] border border-[#E8E4E1] rounded-xl text-sm font-medium text-[#2C2511] focus:outline-none focus:ring-2 focus:ring-[#5F6F65]/30"
              />
            </div>
          </div>
          <div>
            <label className="text-xs font-black uppercase tracking-wider text-[#8A7A6A] block mb-2">App Password</label>
            <div className="relative">
              <Key size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#9C8A7A]" />
              <input type="password" value={gmailPass} onChange={e => setGmailPass(e.target.value)}
                placeholder="xxxx xxxx xxxx xxxx"
                className="w-full pl-11 pr-4 py-3 bg-[#FAF8F3] border border-[#E8E4E1] rounded-xl text-sm font-medium text-[#2C2511] focus:outline-none focus:ring-2 focus:ring-[#5F6F65]/30"
              />
            </div>
          </div>
        </div>
      </section>

      {/* System Updates */}
      <section className="bg-white rounded-3xl p-8 border border-[#E8E4E1] shadow-sm space-y-5">
        <h3 className="text-lg font-black flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-[#F2EFE9] flex items-center justify-center text-[#5F6F65]"><Download size={18} /></div>
          System Updates
        </h3>
        <p className="text-xs text-[#9C8A7A] leading-relaxed">
          Pulls the latest code from GitHub and rebuilds the app. Only available in development (source) mode —
          packaged DMG builds update via the OTA system automatically.
        </p>
        <button
          onClick={handleCheckUpdate}
          disabled={updateStatus === 'checking' || updateStatus === 'installing'}
          className={`flex items-center gap-3 px-6 py-3 rounded-xl font-black text-sm transition-all ${
            updateStatus === 'installing'
              ? 'bg-amber-500 text-white cursor-not-allowed'
              : updateStatus === 'checking'
              ? 'bg-[#9C8A7A] text-white cursor-not-allowed'
              : updateStatus === 'up-to-date'
              ? 'bg-emerald-500 text-white'
              : updateStatus === 'error'
              ? 'bg-rose-500 text-white'
              : 'bg-[#5F6F65] hover:bg-[#4A6657] text-white'
          }`}
        >
          {updateStatus === 'checking' && <><RefreshCw size={16} className="animate-spin" /> Checking...</>}
          {updateStatus === 'installing' && <><RefreshCw size={16} className="animate-spin" /> Installing Update — Do Not Close App...</>}
          {updateStatus === 'up-to-date' && <><CheckCircle2 size={16} /> Already Up to Date</>}
          {updateStatus === 'error' && <><RefreshCw size={16} /> Update Failed — Retry</>}
          {(updateStatus === 'idle' || updateStatus === 'unavailable') && <><Download size={16} /> Check for Updates</>}
        </button>
      </section>

      {/* Stripe Integration */}
      <section className="bg-white rounded-3xl p-8 border border-[#E8E4E1] shadow-sm space-y-5">
        <h3 className="text-lg font-black flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-[#F2EFE9] flex items-center justify-center text-[#5F6F65]"><Link size={18} /></div>
          Stripe Integration
        </h3>
        <p className="text-xs text-[#9C8A7A] leading-relaxed">
          Two keys are required. The <strong>Restricted Key</strong> (<code className="bg-[#F2EFE9] px-1 rounded text-[#5F6F65] font-black">rk_...</code>) authenticates server-side API calls.
          The <strong>Publishable Key</strong> (<code className="bg-[#F2EFE9] px-1 rounded text-[#5F6F65] font-black">pk_...</code>) is required to open the bank-linking window.
          Both are available in <strong>Stripe Dashboard → Developers → API keys</strong>.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div>
            <label className="text-xs font-black uppercase tracking-wider text-[#8A7A6A] block mb-2">Secret Key (sk_test_...)</label>
            <div className="relative">
              <Key size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#9C8A7A]" />
              <input
                type="password"
                value={stripeKey}
                onChange={e => setStripeKey(e.target.value)}
                placeholder="sk_test_51P..."
                className="w-full pl-11 pr-4 py-3 bg-[#FAF8F3] border border-[#E8E4E1] rounded-xl text-sm font-medium text-[#2C2511] focus:outline-none focus:ring-2 focus:ring-[#5F6F65]/30"
              />
            </div>
          </div>
          <div>
            <label className="text-xs font-black uppercase tracking-wider text-[#8A7A6A] block mb-2">Publishable Key (pk_test_...)</label>
            <div className="relative">
              <Key size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#9C8A7A]" />
              <input
                type="text"
                value={stripePubKey}
                onChange={e => setStripePubKey(e.target.value)}
                placeholder="pk_test_51P..."
                className="w-full pl-11 pr-4 py-3 bg-[#FAF8F3] border border-[#E8E4E1] rounded-xl text-sm font-medium text-[#2C2511] focus:outline-none focus:ring-2 focus:ring-[#5F6F65]/30"
              />
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <button
            onClick={handleStripeTest}
            disabled={!stripeKey.trim() || stripeTestStatus === 'testing'}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-black text-sm transition-all disabled:opacity-50 ${
              stripeTestStatus === 'ok' ? 'bg-emerald-500 text-white'
              : stripeTestStatus === 'error' ? 'bg-rose-500 text-white'
              : 'bg-[#5F6F65] hover:bg-[#4A6657] text-white'
            }`}
          >
            {stripeTestStatus === 'testing' && <RefreshCw size={14} className="animate-spin" />}
            {stripeTestStatus === 'ok' && <CheckCircle2 size={14} />}
            {stripeTestStatus === 'error' && <AlertCircle size={14} />}
            {stripeTestStatus === 'idle' && <Link size={14} />}
            {stripeTestStatus === 'testing' ? 'Testing…'
              : stripeTestStatus === 'ok' ? 'Connected!'
              : stripeTestStatus === 'error' ? 'Failed — Retry'
              : 'Test Connection'}
          </button>
          {stripeTestError && (
            <span className="text-xs font-bold text-rose-600">{stripeTestError}</span>
          )}
        </div>
        <p className="text-[10px] text-[#9C8A7A] font-medium italic">
          Your key is stored locally in your app data folder. It is never transmitted to any server.
        </p>
      </section>

      {/* SMS Reminders */}
      <section className="bg-white rounded-3xl p-8 border border-[#E8E4E1] shadow-sm space-y-5">
        <h3 className="text-lg font-black flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-[#F2EFE9] flex items-center justify-center text-[#5F6F65]"><MessageSquare size={18} /></div>
          SMS Reminders
        </h3>
        <p className="text-xs text-[#9C8A7A] leading-relaxed">
          Connect your Twilio account to enable automatic client SMS reminders — a 3-day notice and a morning-of message.
          Use a Twilio number in <strong>E.164 format</strong> (e.g. +16025551234).
        </p>
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs font-bold text-amber-700">
          ⚠ Ensure SMS consent is added to your Pixiset booking form before enabling.
        </div>
        <div className="space-y-4">
          {[
            { label: 'Account SID', value: smsSid, set: setSmsSid, placeholder: 'ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx' },
            { label: 'Auth Token', value: smsToken, set: setSmsToken, placeholder: 'Your Twilio auth token', secret: true },
            { label: 'From Number', value: smsFrom, set: setSmsFrom, placeholder: '+16025551234' },
          ].map(({ label, value, set, placeholder, secret }) => (
            <div key={label}>
              <label className="text-xs font-black uppercase tracking-wider text-[#8A7A6A] block mb-2">{label}</label>
              <div className="relative">
                <MessageSquare size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#9C8A7A]" />
                <input
                  type={secret ? 'password' : 'text'}
                  value={value}
                  onChange={e => set(e.target.value)}
                  placeholder={placeholder}
                  className="w-full pl-11 pr-4 py-3 bg-[#FAF8F3] border border-[#E8E4E1] rounded-xl text-sm font-medium text-[#2C2511] focus:outline-none focus:ring-2 focus:ring-[#5F6F65]/30"
                />
              </div>
            </div>
          ))}
        </div>
        <p className="text-[10px] text-[#9C8A7A] font-medium italic">
          Credentials are stored locally in your app data folder and never transmitted.
        </p>
      </section>

      {/* Help & Onboarding */}
      <section className="bg-white rounded-3xl p-8 border border-[#E8E4E1] shadow-sm space-y-5">
        <h3 className="text-lg font-black flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-[#F2EFE9] flex items-center justify-center text-[#5F6F65]"><Compass size={18} /></div>
          Help &amp; Onboarding
        </h3>
        <p className="text-xs text-[#9C8A7A] leading-relaxed">
          New to the Command Center? Launch the guided tour for a walkthrough of all six modules — Dashboard, Tax Planner, Write-offs, ROI Analyzer, Compliance, and Settings.
        </p>
        <button
          onClick={() => setRunTour(true)}
          className="flex items-center gap-3 px-6 py-3 rounded-xl font-black text-sm bg-[#5F6F65] hover:bg-[#4A6657] text-white transition-all active:scale-95"
        >
          <Compass size={16} /> Start Guided Tour
        </button>
      </section>

      {/* Save */}
      <span aria-live="polite" className="sr-only">{saved ? 'Settings saved successfully.' : ''}</span>
      <button onClick={handleSave}
        className={`w-full flex items-center justify-center gap-3 py-4 rounded-2xl font-black text-base transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5F6F65]/60 focus-visible:ring-offset-2 ${
          saved ? 'bg-emerald-500 text-white' : 'bg-[#5F6F65] hover:bg-[#4A6657] text-white'
        }`}
      >
        {saved ? <><CheckCircle2 size={20} /> Saved!</> : <><Save size={20} /> Save All Settings</>}
      </button>
    </div>
  );
};

export default SettingsView;
