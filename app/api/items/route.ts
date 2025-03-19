import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import mongoose from 'mongoose';
import Item from '@/models/Item';

export async function GET(): Promise<NextResponse> {
  try {
    console.log('Connecting to database...');
    await dbConnect();
    console.log('Connected to database successfully');
    
    // Get connection information
    const connInfo = mongoose.connection;
    console.log('Connection info:');
    console.log('- Database name:', connInfo.db?.databaseName);
    console.log('- Host:', connInfo.host);
    console.log('- Port:', connInfo.port);
    console.log('- Connection URI:', process.env.MONGODB_URI?.replace(/\/\/([^:]+):([^@]+)@/, '//***:***@')); // Mask credentials
    
    // List all collections
    const collections = await connInfo.db?.listCollections().toArray();
    console.log('Available collections:', collections?.map(c => c.name));
    
    // Try to fetch items using Mongoose
    const items = await Item.find({});
    console.log('Items fetched with Mongoose:', items.length);
    
    // Debug: Check how position is stored on each item
    items.forEach((item, index) => {
      console.log(`Item ${index} - ${item.name}:`);
      console.log('- Has position:', item.hasOwnProperty('position'));
      console.log('- Position type:', typeof item.position);
      console.log('- Position value:', JSON.stringify(item.position));
      console.log('- Raw _doc position:', JSON.stringify(item._doc?.position));
    });
    
    // Direct MongoDB collection access to bypass Mongoose
    if (connInfo.db) {
      try {
        const rawCollection = connInfo.db.collection('entries');
        const rawItems = await rawCollection.find({}).toArray();
        
        console.log('Items fetched directly from MongoDB:', rawItems.length);
        
        // Debug: Check raw position data from MongoDB
        rawItems.forEach((rawItem, index) => {
          console.log(`Raw MongoDB Item ${index} - ${rawItem.name}:`);
          console.log('- Has position:', rawItem.hasOwnProperty('position'));
          console.log('- Position type:', typeof rawItem.position);
          console.log('- Position value:', JSON.stringify(rawItem.position));
          console.log('- All fields:', Object.keys(rawItem));
        });
        
        // Return both Mongoose and raw items for comparison
        return NextResponse.json({ 
          connectionInfo: {
            database: connInfo.db?.databaseName,
            host: connInfo.host,
            collections: collections?.map(c => c.name)
          },
          items,
          rawItems
        });
      } catch (error) {
        console.error('Error fetching raw items:', error);
      }
    }
    
    return NextResponse.json({ 
      connectionInfo: {
        database: connInfo.db?.databaseName,
        host: connInfo.host,
        collections: collections?.map(c => c.name)
      },
      items 
    });
  } catch (error) {
    console.error('Error fetching items:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch items', 
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const body = await request.json();
    console.log('Received create item request with body:', JSON.stringify(body));
    
    // Handle position format conversion if needed
    if (body.position && typeof body.position === 'string') {
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
      
      body.position = positionMap[body.position] || {x: 3, y: 3};
    }
    
    // Ensure position is in the correct format if present
    if (!body.position || typeof body.position !== 'object') {
      body.position = {x: 3, y: 3}; // Default to center
    } else {
      // Validate and normalize x and y values
      const x = typeof body.position.x === 'number' ? body.position.x : 
              (Number(body.position.x) || 3);
      const y = typeof body.position.y === 'number' ? body.position.y : 
              (Number(body.position.y) || 3);
      
      // Clamp values
      body.position = {
        x: Math.min(Math.max(x, 1), 5),
        y: Math.min(Math.max(y, 1), 5)
      };
    }
    
    console.log('Creating item with position:', JSON.stringify(body.position));
    
    await dbConnect();
    const newItem = await Item.create(body);
    console.log('Item created successfully with ID:', newItem._id);
    console.log('Position saved in database:', JSON.stringify(newItem.position));
    
    return NextResponse.json({ item: newItem }, { status: 201 });
  } catch (error) {
    console.error('Error creating item:', error);
    return NextResponse.json({ error: 'Failed to create item' }, { status: 500 });
  }
} 