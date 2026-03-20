import React, { useState } from 'react';
import { useAppState } from '../../contexts/StateContext';
import { Settings, User, Mail, Key, Save, CheckCircle2, RefreshCw } from 'lucide-react';

const SettingsView = () => {
  const { state, updateState } = useAppState();
  const [saved, setSaved] = useState(false);
  const [gmailAddress, setGmailAddress] = useState(state.emailSettings?.address || '');
  const [gmailPass, setGmailPass] = useState(state.emailSettings?.appPassword || '');
  const [profileName, setProfileName] = useState(state.businessProfile?.name || 'Ariana');
  const [profileBiz, setProfileBiz] = useState(state.businessProfile?.businessName || 'The Love Lens by Ariana');
  const [profileState, setProfileState] = useState(state.businessProfile?.state || 'Arizona');

  const handleSave = () => {
    updateState({
      emailSettings: { address: gmailAddress, appPassword: gmailPass },
      businessProfile: { name: profileName, businessName: profileBiz, state: profileState }
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="p-10 max-w-3xl mx-auto space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <header>
        <div className="flex items-center gap-3 text-[#9C8A7A] text-sm font-bold uppercase tracking-widest mb-2">
          <Settings size={14} /><span>Settings</span>
        </div>
        <h2 className="text-5xl font-black text-[#2C2511] tracking-tight">App Settings</h2>
        <p className="text-[#8A7A6A] mt-2 text-lg">Manage your profile and integrations.</p>
      </header>

      {/* Business Profile */}
      <section className="bg-white rounded-3xl p-8 border border-[#E8E4E1] shadow-sm space-y-5">
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

      {/* Save */}
      <button onClick={handleSave}
        className={`w-full flex items-center justify-center gap-3 py-4 rounded-2xl font-black text-base transition-all ${
          saved ? 'bg-emerald-500 text-white' : 'bg-[#5F6F65] hover:bg-[#4A6657] text-white'
        }`}
      >
        {saved ? <><CheckCircle2 size={20} /> Saved!</> : <><Save size={20} /> Save All Settings</>}
      </button>
    </div>
  );
};

export default SettingsView;
