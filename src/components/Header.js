import React from 'react';

function Header() {
  return (
    <header className="text-center mb-10">
      <h1 className="text-4xl sm:text-5xl font-extrabold text-white mb-2 tracking-tight">Lords Mobile Stat Tracker</h1>
      <p className="text-lg text-gray-400">Upload player profile screenshots to automatically track might and kill progression.</p>
    </header>
  );
}

export default Header;