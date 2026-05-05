import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const [tasks, technicians, materials] = await Promise.all([
      fetch('http://127.0.0.1:8000/api/lookup/tasks').then(r => r.json()).catch(() => []),
      fetch('http://127.0.0.1:8000/api/lookup/technicians').then(r => r.json()).catch(() => []),
      fetch('http://127.0.0.1:8000/api/lookup/materials').then(r => r.json()).catch(() => []),
    ]);
    return NextResponse.json({ tasks, technicians, materials });
  } catch (e) {
    return NextResponse.json({ tasks: [], technicians: [], materials: [] });
  }
}
