export type Contact = {
  id: string;
  name: string;
  email: string;
  phone?: string;
};

export type Task = {
  id: string;
  title: string;
  contactId: string;
  date: string; // YYYY-MM-DD
  jobType?: string;
  address?: string;
  startTime?: string; // HH:mm
  endTime?: string; // HH:mm
  notes?: string;
  status?: 'pending' | 'completed' | 'in-progress';
  priority?: 'low' | 'medium' | 'high';
  createdAt: string;
};

export type SchedulerData = {
  contacts: Contact[];
  tasks: Task[];
};

const STORAGE_KEY = 'th3scheduler-data';

const defaultData: SchedulerData = {
  contacts: [],
  tasks: [],
};

export function loadData(): SchedulerData {
  if (typeof window === 'undefined') {
    return defaultData;
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultData;
    return JSON.parse(raw) as SchedulerData;
  } catch (error) {
    console.error('Failed to load scheduler data', error);
    return defaultData;
  }
}

export function saveData(data: SchedulerData) {
  if (typeof window === 'undefined') return;

  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (error) {
    console.error('Failed to save scheduler data', error);
  }
}

export function upsertContact(contact: Contact) {
  const data = loadData();
  const existing = data.contacts.find((item) => item.email === contact.email);
  if (existing) {
    return existing;
  }

  data.contacts.push(contact);
  saveData(data);
  return contact;
}

export function addTask(task: Task) {
  const data = loadData();
  data.tasks.push(task);
  saveData(data);
  return task;
}

export function getContactTasks(contactId: string) {
  const data = loadData();
  return data.tasks.filter((task) => task.contactId === contactId);
}

export function getTasksForDate(date: string) {
  const data = loadData();
  return data.tasks.filter((task) => task.date === date);
}
