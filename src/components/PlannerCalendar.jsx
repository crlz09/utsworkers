import { useState } from 'react';
import { calendarDays, localDateKey } from '../lib/planner';

export default function PlannerCalendar({ tasks, onOpen, onCreate, onReschedule, busy }) {
  const [anchor, setAnchor] = useState(localDateKey());
  const [mode, setMode] = useState('month');
  const days = calendarDays(anchor, mode);
  const today = localDateKey();
  const move = (direction) => {
    const date = new Date(`${anchor}T12:00:00`);
    if (mode === 'week') date.setDate(date.getDate() + direction * 7);
    else { date.setDate(1); date.setMonth(date.getMonth() + direction); }
    setAnchor(localDateKey(date));
  };
  return <section className="planner-calendar" aria-label="Task calendar">
    <div className="planner-calendar-heading">
      <div><button aria-label="Previous period" onClick={() => move(-1)}>←</button>
        <button onClick={() => setAnchor(today)}>Today</button>
        <button aria-label="Next period" onClick={() => move(1)}>→</button></div>
      <h2>{new Date(`${anchor}T12:00:00`).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}</h2>
      <label>Calendar range <select value={mode} onChange={e => setMode(e.target.value)}><option value="month">Month</option><option value="week">Week</option></select></label>
    </div>
    <p className="planner-calendar-hint">Select + to schedule a task. Drag a task to reschedule, or edit its due date in task details.</p>
    <div className="planner-calendar-scroll"><div className="planner-calendar-grid">
      {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(day => <div className="planner-weekday" key={day}>{day}</div>)}
      {days.map(day => <div key={day} className={`planner-day ${day === today ? 'today' : ''} ${day.slice(0,7) !== anchor.slice(0,7) ? 'outside' : ''}`}
        onDragOver={e => { if (!busy) e.preventDefault(); }} onDrop={e => {
          e.preventDefault(); const task = tasks.find(t => t.id === e.dataTransfer.getData('text/plain'));
          if (task && !busy) onReschedule(task, day);
        }}>
        <div className="planner-day-heading"><time dateTime={day}>{Number(day.slice(-2))}</time><button disabled={busy} aria-label={`Add task on ${day}`} onClick={() => onCreate(day)}>+</button></div>
        {tasks.filter(t => t.due_date === day).map(task => <button key={task.id} className={`planner-calendar-event ${task.status}`} draggable={!busy}
          onDragStart={e => e.dataTransfer.setData('text/plain', task.id)} onClick={() => onOpen(task)}>
          {task.recurrence === 'weekly' ? '↻ ' : ''}{task.title}<small>{task.worker?.name || task.status.replaceAll('_', ' ')}</small>
        </button>)}
      </div>)}
    </div></div>
    <div className="planner-unscheduled"><h3>Unscheduled · {tasks.filter(t => !t.due_date).length}</h3>
      {tasks.filter(t => !t.due_date).map(task => <button key={task.id} draggable={!busy} onDragStart={e => e.dataTransfer.setData('text/plain', task.id)} onClick={() => onOpen(task)}>{task.title}</button>)}
    </div>
  </section>;
}
