import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import './index.css';

const container = document.getElementById('root')!;

// Reminder window uses the same bundle but with the #reminder hash so we can
// render the lightweight reminder UI instead of the full board.
if (window.location.hash === '#reminder') {
  import('./components/TaskReminder').then(({ default: TaskReminder }) => {
    createRoot(container).render(
      <StrictMode>
        <TaskReminder />
      </StrictMode>
    );
  });
} else {
  import('./App').then(({ default: App }) => {
    createRoot(container).render(
      <StrictMode>
        <App />
      </StrictMode>
    );
  });
}

