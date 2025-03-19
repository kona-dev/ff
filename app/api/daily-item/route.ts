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
    
    // Log the entire document and check for position before converting
    console.log('Raw MongoDB document:', dailyItem);
    console.log('Position field exists on document:', dailyItem.hasOwnProperty('position'));
    console.log('Position type on document:', typeof dailyItem.position);
    console.log('Keys in document:', Object.keys(dailyItem));
    console.log('Keys in document._doc:', Object.keys(dailyItem._doc || {}));
    
    // Convert Mongoose document to plain object
    const item = dailyItem.toObject();
    
    // Log full converted object to see its structure
    console.log('Full converted item:', JSON.stringify(item, null, 2));
    console.log('Position field exists on plain object:', item.hasOwnProperty('position'));
    console.log('Position type on plain object:', typeof item.position);
    
    // Check if the position field is present but at a different path
    if (!item.position) {
      console.log('Checking _doc for position:', dailyItem._doc?.position);
      // Try to find it in the possible locations
      const possiblePosition = dailyItem._doc?.position || item._doc?.position;
      if (possiblePosition) {
        console.log('Found position in _doc:', possiblePosition);
        item.position = possiblePosition;
      }
    }
    
    // Handle position correctly based on its structure
    if (!item.position) {
      // If position is missing, set default
      item.position = {x: 3, y: 3};
      console.log('Set default position (missing):', item.position);
    } else if (typeof item.position === 'string') {
      // Map old string positions to new coordinate system
      const positionMap: Record<string, {x: number, y: number}> = {
        'top left': {x: 1, y: 1},
        'top middle': {x: 3, y: 1},
        'top right': {x: 5, y: 1},
        'middle left': {x: 1, y: 3},
        'middle': {x: 3, y: 3},
        'middle right': {x: 5, y: 3},
        'bottom left': {x: 1, y: 5},
        'bottom middle': {x: 3, y: 5},
        'bottom right': {x: 5, y: 5}
      };
      
      item.position = positionMap[item.position] || {x: 3, y: 3};
      console.log('Converted string position to:', item.position);
    } else {
      // Position is already an object - ensure x and y are valid numbers
      console.log('Position object structure:', JSON.stringify(item.position));
      let x = 3;
      let y = 3;
      
      // Check if position has x and y properties
      if (item.position.hasOwnProperty('x') && !isNaN(Number(item.position.x))) {
        x = Number(item.position.x);
        console.log('Found x coordinate:', x);
      } else {
        console.log('x coordinate missing or invalid');
      }
      
      if (item.position.hasOwnProperty('y') && !isNaN(Number(item.position.y))) {
        y = Number(item.position.y);
        console.log('Found y coordinate:', y);
      } else {
        console.log('y coordinate missing or invalid');
      }
      
      // Clamp values to valid range (1-5)
      item.position = {
        x: Math.min(Math.max(x, 1), 5),
        y: Math.min(Math.max(y, 1), 5)
      };
      
      console.log('Final position object being returned:', item.position);
    }
    
    return NextResponse.json({ item });
  } catch (error) {
    console.error('Error fetching daily item:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch daily item', 
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 