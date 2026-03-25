import React from 'react';
import { CheckCircle2, Clock } from 'lucide-react';

const Badge = ({ sent, label }) => (
  <div className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold border ${
    sent
      ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
      : 'bg-[#F2F2F0] border-[#D0CFC8] text-[#8A8A80]'
  }`}>
    {sent ? <CheckCircle2 size={13} /> : <Clock size={13} />}
    {label}
  </div>
);

const SmsLogPanel = ({ client }) => {
  const { threeDaySent, morningOfSent } = client.smsReminders || {};

  return (
    <div className="space-y-4">
      <p className="text-xs text-[#9C8A7A] leading-relaxed">
        Automatic SMS reminders are sent via Twilio. Configure your Twilio credentials in Settings → SMS Reminders.
        Reminders fire once per client and are not re-sent after the session date.
      </p>

      {!client.phone && (
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs font-bold text-amber-700">
          No phone number on file — add one in the Overview tab to enable SMS reminders.
        </div>
      )}

      <div className="space-y-2">
        <div className="text-xs font-black uppercase tracking-widest text-[#9C8A7A] mb-2">Reminder Status</div>
        <Badge sent={threeDaySent} label="3-Day Reminder" />
        <Badge sent={morningOfSent} label="Morning-Of Reminder" />
      </div>

      {client.phone && (
        <div className="text-xs text-[#9C8A7A]">
          Sending to: <span className="font-bold text-[#5F6F65]">{client.phone}</span>
        </div>
      )}
    </div>
  );
};

export default SmsLogPanel;
