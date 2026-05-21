"use client"

// A simple client-side mock database using LocalStorage
// Replicates the chainable Supabase client syntax:
// supabase.from(table).select(...).eq(...).order(...)

const SEED_VERSION = "v2.0"; // Increment this to force re-seeding

// Helper to generate UUIDs
function uuidv4() {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

// Generate last 30 days of attendance (excluding today)
function generateAttendanceSeed(staffList: any[]) {
  const attendance: any[] = [];
  const today = new Date();
  
  for (let i = 1; i <= 30; i++) {
    const date = new Date();
    date.setDate(today.getDate() - i);
    const dateStr = date.toISOString().split("T")[0];
    
    staffList.forEach(staff => {
      // 90% attendance rate
      const status = Math.random() > 0.1 ? "present" : "absent";
      attendance.push({
        id: uuidv4(),
        staff_id: staff.id,
        date: dateStr,
        status,
        created_at: new Date(date).toISOString()
      });
    });
  }
  return attendance;
}

// Initial seed data
const getInitialSeed = () => {
  const rooms = [
    { id: "r101", room_number: "101", has_attached_bathroom: true, current_status: "available", is_active: true, created_at: new Date().toISOString() },
    { id: "r102", room_number: "102", has_attached_bathroom: false, current_status: "booked", is_active: true, created_at: new Date().toISOString() },
    { id: "r103", room_number: "103", has_attached_bathroom: true, current_status: "checked_in", is_active: true, created_at: new Date().toISOString() },
    { id: "r104", room_number: "104", has_attached_bathroom: false, current_status: "checked_out", is_active: true, created_at: new Date().toISOString() },
    { id: "r105", room_number: "105", has_attached_bathroom: true, current_status: "cleaning", is_active: true, created_at: new Date().toISOString() },
    { id: "r201", room_number: "201", has_attached_bathroom: true, current_status: "available", is_active: true, created_at: new Date().toISOString() },
    { id: "r202", room_number: "202", has_attached_bathroom: false, current_status: "available", is_active: true, created_at: new Date().toISOString() },
    { id: "r203", room_number: "203", has_attached_bathroom: false, current_status: "available", is_active: true, created_at: new Date().toISOString() },
    { id: "r204", room_number: "204", has_attached_bathroom: true, current_status: "available", is_active: true, created_at: new Date().toISOString() },
    { id: "r205", room_number: "205", has_attached_bathroom: false, current_status: "available", is_active: true, created_at: new Date().toISOString() }
  ];

  const bookings = [
    {
      id: "b1",
      customer_name: "Alice Johnson",
      phone_number: "+91 9876543210",
      room_id: "r102",
      check_in_date: new Date(Date.now() + 86400000).toISOString(), // Tomorrow
      check_out_date: new Date(Date.now() + 3 * 86400000).toISOString(),
      status: "booked",
      created_at: new Date().toISOString()
    },
    {
      id: "b2",
      customer_name: "Bob Smith",
      phone_number: "+91 9123456789",
      room_id: "r103",
      check_in_date: new Date().toISOString(), // Today
      check_out_date: new Date(Date.now() + 2 * 86400000).toISOString(),
      status: "checked_in",
      created_at: new Date().toISOString()
    },
    {
      id: "b3",
      customer_name: "Charlie Brown",
      phone_number: "+91 9998887776",
      room_id: "r104",
      check_in_date: new Date(Date.now() - 2 * 86400000).toISOString(), // Checked out today
      check_out_date: new Date().toISOString(),
      status: "checked_out",
      created_at: new Date(Date.now() - 2 * 86400000).toISOString()
    }
  ];

  const todayStr = new Date().toISOString().split("T")[0];
  const hall_bookings = [
    {
      id: "h1",
      customer_name: "KSEB Annual Union Meeting",
      phone_number: "+91 9898989898",
      event_date: todayStr,
      start_time: "09:00",
      end_time: "13:00",
      purpose: "Annual general assembly and staff discussion",
      status: "confirmed",
      created_at: new Date().toISOString()
    },
    {
      id: "h2",
      customer_name: "Retirement Celebration - Anil Kumar",
      phone_number: "+91 9797979797",
      event_date: new Date(Date.now() + 86400000).toISOString().split("T")[0], // Tomorrow
      start_time: "14:00",
      end_time: "18:00",
      purpose: "Farewell ceremony and dinner",
      status: "confirmed",
      created_at: new Date().toISOString()
    }
  ];

  const dormitories = [
    { id: "d1", name: "Gents Executive Dormitory", is_active: true, created_at: new Date().toISOString() },
    { id: "d2", name: "Ladies Executive Dormitory", is_active: true, created_at: new Date().toISOString() }
  ];

  // Generate beds for Gents (4x4 layout = 16 beds)
  const beds: any[] = [];
  const bed_bookings: any[] = [];

  // Gents Dorm beds
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 4; c++) {
      const bedChar = String.fromCharCode(65 + r); // A, B, C, D
      const bedNum = `G-${bedChar}${c + 1}`;
      let status = "available";
      if (r === 0 && c === 1) status = "booked";
      if (r === 1 && c === 2) status = "checked_in";
      if (r === 2 && c === 0) status = "cleaning";

      beds.push({
        id: `bed-g-${r}-${c}`,
        dormitory_id: "d1",
        bed_number: bedNum,
        current_status: status,
        row_index: r,
        col_index: c,
        is_active: true,
        created_at: new Date().toISOString()
      });
    }
  }

  // Ladies Dorm beds (3x4 layout = 12 beds)
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 4; c++) {
      const bedChar = String.fromCharCode(65 + r); // A, B, C
      const bedNum = `L-${bedChar}${c + 1}`;
      let status = "available";
      if (r === 0 && c === 0) status = "checked_in";

      beds.push({
        id: `bed-l-${r}-${c}`,
        dormitory_id: "d2",
        bed_number: bedNum,
        current_status: status,
        row_index: r,
        col_index: c,
        is_active: true,
        created_at: new Date().toISOString()
      });
    }
  }

  // Bed Bookings
  bed_bookings.push(
    {
      id: "bb1",
      customer_name: "Rahul Verma",
      phone_number: "+91 8887776665",
      bed_id: "bed-g-0-1", // booked G-A2
      check_in_date: new Date(Date.now() + 86400000).toISOString(),
      check_out_date: new Date(Date.now() + 3 * 86400000).toISOString(),
      status: "booked",
      created_at: new Date().toISOString()
    },
    {
      id: "bb2",
      customer_name: "Suresh Menon",
      phone_number: "+91 7776665554",
      bed_id: "bed-g-1-2", // checked_in G-B3
      check_in_date: new Date().toISOString(),
      check_out_date: new Date(Date.now() + 2 * 86400000).toISOString(),
      status: "checked_in",
      created_at: new Date().toISOString()
    },
    {
      id: "bb3",
      customer_name: "Meera Nair",
      phone_number: "+91 9665554443",
      bed_id: "bed-l-0-0", // checked_in L-A1
      check_in_date: new Date().toISOString(),
      check_out_date: new Date(Date.now() + 1 * 86400000).toISOString(),
      status: "checked_in",
      created_at: new Date().toISOString()
    }
  );

  const staff = [
    { id: "s1", name: "Ramesh Kumar", role: "General Manager", phone_number: "+91 9000100010", is_active: true, created_at: new Date().toISOString() },
    { id: "s2", name: "Suresh Nair", role: "Receptionist", phone_number: "+91 9000200020", is_active: true, created_at: new Date().toISOString() },
    { id: "s3", name: "Sita Devi", role: "Housekeeping Supervisor", phone_number: "+91 9000300030", is_active: true, created_at: new Date().toISOString() },
    { id: "s4", name: "Anil Pillai", role: "Security Head", phone_number: "+91 9000400040", is_active: true, created_at: new Date().toISOString() },
    { id: "s5", name: "Vikram Singh", role: "Maintenance Tech", phone_number: "+91 9000500050", is_active: true, created_at: new Date().toISOString() }
  ];

  const attendance = generateAttendanceSeed(staff);

  return {
    rooms,
    bookings,
    hall_bookings,
    dormitories,
    beds,
    bed_bookings,
    staff,
    attendance
  };
};

// Initialize DB in LocalStorage
export function initializeDB() {
  if (typeof window === "undefined") return;

  const currentSeedVersion = localStorage.getItem("staymanager_seed_version");
  if (currentSeedVersion !== SEED_VERSION) {
    const seed = getInitialSeed();
    Object.entries(seed).forEach(([tableName, data]) => {
      localStorage.setItem(`sm_db_${tableName}`, JSON.stringify(data));
    });
    localStorage.setItem("staymanager_seed_version", SEED_VERSION);
    console.log("Mock Database initialized & seeded with version", SEED_VERSION);
  }
}

// Ensure database is initialized before any operations
if (typeof window !== "undefined") {
  initializeDB();
}

function getTableData(table: string): any[] {
  if (typeof window === "undefined") return [];
  const stored = localStorage.getItem(`sm_db_${table}`);
  return stored ? JSON.parse(stored) : [];
}

function setTableData(table: string, data: any[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(`sm_db_${table}`, JSON.stringify(data));
}

class MockQueryBuilder {
  private tableName: string;
  private filters: Array<(item: any) => boolean> = [];
  private orderField: string | null = null;
  private orderAscending = true;
  private limitCount: number | null = null;
  private isSingle = false;
  private exactCount = false;

  private operation: 'select' | 'insert' | 'update' | 'delete' = 'select';
  private insertRows: any[] = [];
  private updateChanges: any = null;

  constructor(tableName: string) {
    this.tableName = tableName;
  }

  select(columns?: string, options?: { count?: string; head?: boolean }) {
    this.operation = 'select';
    if (options?.count === "exact") {
      this.exactCount = true;
    }
    return this;
  }

  insert(rows: any[]) {
    this.operation = 'insert';
    this.insertRows = Array.isArray(rows) ? rows : [rows];
    return this;
  }

  update(changes: any) {
    this.operation = 'update';
    this.updateChanges = changes;
    return this;
  }

  delete() {
    this.operation = 'delete';
    return this;
  }

  eq(field: string, value: any) {
    this.filters.push(item => item[field] === value);
    return this;
  }

  neq(field: string, value: any) {
    this.filters.push(item => item[field] !== value);
    return this;
  }

  gte(field: string, value: any) {
    this.filters.push(item => {
      if (!item[field]) return false;
      return new Date(item[field]) >= new Date(value);
    });
    return this;
  }

  lte(field: string, value: any) {
    this.filters.push(item => {
      if (!item[field]) return false;
      return new Date(item[field]) <= new Date(value);
    });
    return this;
  }

  in(field: string, values: any[]) {
    this.filters.push(item => values.includes(item[field]));
    return this;
  }

  like(field: string, pattern: string) {
    const rawPattern = pattern.replace(/%/g, "");
    this.filters.push(item => {
      const val = item[field];
      if (val === null || val === undefined) return false;
      return String(val).toLowerCase().includes(rawPattern.toLowerCase());
    });
    return this;
  }

  filter(field: string, operator: string, value: any) {
    if (operator === 'eq') {
      this.filters.push(item => item[field] === value);
    } else if (operator === 'neq') {
      this.filters.push(item => item[field] !== value);
    } else if (operator === 'gte') {
      this.filters.push(item => {
        if (!item[field]) return false;
        return new Date(item[field]) >= new Date(value);
      });
    } else if (operator === 'lte') {
      this.filters.push(item => {
        if (!item[field]) return false;
        return new Date(item[field]) <= new Date(value);
      });
    }
    return this;
  }

  order(field: string, { ascending = true } = {}) {
    this.orderField = field;
    this.orderAscending = ascending;
    return this;
  }

  limit(count: number) {
    this.limitCount = count;
    return this;
  }

  single() {
    this.isSingle = true;
    return this;
  }

  // Execution
  async execute() {
    if (this.operation === 'insert') {
      const tableData = getTableData(this.tableName);
      const newRows = this.insertRows.map(row => ({
        id: uuidv4(),
        created_at: new Date().toISOString(),
        ...row
      }));
      setTableData(this.tableName, [...tableData, ...newRows]);
      
      // Trigger window storage event for instant updates
      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("storage"));
      }

      return { data: newRows, error: null };
    }

    if (this.operation === 'update') {
      let tableData = getTableData(this.tableName);
      let updatedRows: any[] = [];

      tableData = tableData.map(item => {
        // Check if item matches current query filters
        let matches = true;
        for (const filter of this.filters) {
          if (!filter(item)) {
            matches = false;
            break;
          }
        }

        if (matches) {
          const updatedItem = { ...item, ...this.updateChanges };
          updatedRows.push(updatedItem);
          return updatedItem;
        }
        return item;
      });

      setTableData(this.tableName, tableData);

      // Trigger window storage event for instant updates
      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("storage"));
      }

      return { data: updatedRows, error: null };
    }

    if (this.operation === 'delete') {
      let tableData = getTableData(this.tableName);
      let deletedCount = 0;

      tableData = tableData.filter(item => {
        let matches = true;
        for (const filter of this.filters) {
          if (!filter(item)) {
            matches = false;
            break;
          }
        }
        if (matches) {
          deletedCount++;
          return false;
        }
        return true;
      });

      setTableData(this.tableName, tableData);

      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("storage"));
      }

      return { error: null, count: deletedCount };
    }

    // Default select operation
    let data = getTableData(this.tableName);

    // Apply filters
    for (const filter of this.filters) {
      data = data.filter(filter);
    }

    const count = data.length;

    // Apply sorting
    if (this.orderField) {
      data.sort((a, b) => {
        const valA = a[this.orderField!];
        const valB = b[this.orderField!];
        if (valA === undefined || valB === undefined) return 0;
        if (valA < valB) return this.orderAscending ? -1 : 1;
        if (valA > valB) return this.orderAscending ? 1 : -1;
        return 0;
      });
    }

    // Apply limit
    if (this.limitCount !== null) {
      data = data.slice(0, this.limitCount);
    }

    // Replicate foreign relations for display purposes
    if (this.tableName === "bookings") {
      const rooms = getTableData("rooms");
      data = data.map(b => ({
        ...b,
        rooms: rooms.find(r => r.id === b.room_id) || null
      }));
    } else if (this.tableName === "bed_bookings") {
      const beds = getTableData("beds");
      const dorms = getTableData("dormitories");
      data = data.map(bb => {
        const bed = beds.find(b => b.id === bb.bed_id) || null;
        const dorm = bed ? dorms.find(d => d.id === bed.dormitory_id) : null;
        return {
          ...bb,
          beds: bed ? { ...bed, dormitories: dorm } : null
        };
      });
    } else if (this.tableName === "attendance") {
      const staffList = getTableData("staff");
      data = data.map(att => ({
        ...att,
        staff: staffList.find(s => s.id === att.staff_id) || null
      }));
    } else if (this.tableName === "beds") {
      const dorms = getTableData("dormitories");
      data = data.map(b => ({
        ...b,
        dormitories: dorms.find(d => d.id === b.dormitory_id) || null
      }));
    }

    if (this.isSingle) {
      return { data: data[0] || null, error: null, count: count || 0 };
    }

    return { data, error: null, count: this.exactCount ? count : null };
  }

  // Standard Thenable for await support
  then(onfulfilled?: (value: any) => any, onrejected?: (reason: any) => any) {
    return this.execute().then(onfulfilled, onrejected);
  }
}

// Client definition with standard auth structures
export const mockSupabaseClient = {
  from(table: string) {
    return new MockQueryBuilder(table);
  },
  auth: {
    getUser: async () => ({
      data: { user: { id: "u1", email: "admin@kseb.org" } },
      error: null as any
    }),
    getSession: async () => ({
      data: { session: { user: { id: "u1", email: "admin@kseb.org" } } },
      error: null as any
    }),
    signInWithPassword: async (credentials?: { email?: string; password?: string }) => ({
      data: { user: { id: "u1", email: "admin@kseb.org" } },
      error: null as any
    }),
    signOut: async () => ({ error: null as any })
  }
};
