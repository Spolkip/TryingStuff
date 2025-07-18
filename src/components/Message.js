import React from 'react';

function Message({ message }) {
  if (!message.text) return null;

  const baseClasses = 'max-w-2xl mx-auto text-center p-4 rounded-md mb-8 transition-opacity duration-300';
  const messageTypeClasses = {
    success: 'bg-green-500/20 text-green-300',
    error: 'bg-red-500/20 text-red-300',
    info: 'bg-blue-500/20 text-blue-300',
  };

  return (
    <div className={`${baseClasses} ${messageTypeClasses[message.type]}`}>
      {message.text}
    </div>
  );
}

export default Message;