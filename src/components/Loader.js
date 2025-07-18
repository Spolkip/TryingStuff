import React from 'react';

function Loader() {
  return (
    <div
      className="loader ease-linear rounded-full border-4 border-t-4 border-gray-200 h-6 w-6"
      style={{ borderTopColor: '#4f46e5' }} // indigo-600
    ></div>
  );
}

export default Loader;