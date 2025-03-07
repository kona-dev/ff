import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Item from '@/models/Item';

export async function GET(): Promise<NextResponse> {
  try {
    await dbConnect();
    
    // Get the current date in PST using timezone-aware approach
    const now = new Date();
    const pstDate = new Date(now.toLocaleString("en-US", {timeZone: "America/Los_Angeles"}));
    const dateString = pstDate.toISOString().split('T')[0]; // YYYY-MM-DD format
    
    // Use the date string as a seed for deterministic randomness
    const seed = dateString.split('-').reduce((acc, val) => acc + parseInt(val), 0);
    
    // Add logging to help with debugging timezone issues
    console.log('Daily Item Selection:', {
      currentUTC: now.toISOString(),
      pstDate: pstDate.toISOString(),
      dateString: dateString,
      seed: seed
    });
    
    // Get all items
    const items = await Item.find({});
    
    if (items.length === 0) {
      return NextResponse.json({ error: 'No items found' }, { status: 404 });
    }
    
    // Use the seed to select a daily item
    const dailyItemIndex = seed % items.length;
    const dailyItem = items[dailyItemIndex];
    
    return NextResponse.json({ item: dailyItem });
  } catch (error) {
    console.error('Error fetching daily item:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch daily item', 
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 