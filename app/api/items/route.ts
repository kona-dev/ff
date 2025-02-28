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
    
    // Try to fetch items
    const items = await Item.find({});
    console.log('Items fetched:', JSON.stringify(items, null, 2));
    console.log('Number of items found:', items.length);
    
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
    await dbConnect();
    
    const newItem = await Item.create(body);
    return NextResponse.json({ item: newItem }, { status: 201 });
  } catch (error) {
    console.error('Error creating item:', error);
    return NextResponse.json({ error: 'Failed to create item' }, { status: 500 });
  }
} 