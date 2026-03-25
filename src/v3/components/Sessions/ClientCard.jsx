import React from 'react';
import { getColors } from '../../utils/sessionColors';

const ClientCard = ({ client, onClick }) => {
  const colors = getColors(client.shootType);
  const unpaid = client.packageTotal - client.amountPaid;

  return (
    <button
      onClick={onClick}
      className={`w-full text-left px-2.5 py-1.5 rounded-lg border text-xs font-bold leading-tight cursor-pointer transition-opacity hover:opacity-80 ${colors.bg} ${colors.border} ${colors.text}`}
    >
      <div className="truncate">{client.name}</div>
      {client.shootTime && (
        <div className="text-[10px] font-medium opacity-70 mt-0.5">{client.shootTime}</div>
      )}
      {unpaid > 0 && (
        <div className="text-[10px] font-black text-amber-600 mt-0.5">
          ${unpaid.toFixed(0)} due
        </div>
      )}
    </button>
  );
};

export default ClientCard;
