import mongoose from 'mongoose';

// Define the schema for your items
const ItemSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please provide a name for this item'],
    maxlength: [60, 'Name cannot be more than 60 characters'],
  },
  imageUrl: {
    type: String,
    required: [true, 'Please provide an image URL for this item'],
  },
  hints: {
    type: [String],
    default: [],
  },
  position: {
    type: mongoose.Schema.Types.Mixed, // Use Mixed type to be more flexible with position formats
    default: { x: 3, y: 3 },
    validate: {
      validator: function(value: any) {
        // Log the value being validated
        console.log('Validating position value:', JSON.stringify(value));
        
        // Handle different possible position formats
        if (typeof value === 'string') {
          // Old string format is valid but will be converted on retrieval
          return true;
        }
        
        if (typeof value === 'object' && value !== null) {
          // Check if x and y properties exist and are numbers or can be converted to numbers
          const hasValidX = value.hasOwnProperty('x') && 
                           !isNaN(Number(value.x)) && 
                           Number(value.x) >= 1 && 
                           Number(value.x) <= 5;
          
          const hasValidY = value.hasOwnProperty('y') && 
                           !isNaN(Number(value.y)) && 
                           Number(value.y) >= 1 && 
                           Number(value.y) <= 5;
          
          console.log('Position validation result:', {
            hasValidX,
            hasValidY,
            x: value.x,
            y: value.y
          });
          
          return hasValidX && hasValidY;
        }
        
        return false;
      },
      message: 'Position must have x and y coordinates between 1 and 5'
    },
    get: function(value: any) {
      // Ensure we always return an object with x and y properties
      if (!value) return { x: 3, y: 3 };
      
      if (typeof value === 'string') {
        // Convert string positions to coordinates if they somehow got saved
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
        
        return positionMap[value] || { x: 3, y: 3 };
      }
      
      if (typeof value === 'object' && value !== null) {
        // Ensure x and y are valid numbers
        const x = value.hasOwnProperty('x') && !isNaN(Number(value.x)) 
                 ? Math.min(Math.max(Number(value.x), 1), 5) 
                 : 3;
        
        const y = value.hasOwnProperty('y') && !isNaN(Number(value.y)) 
                 ? Math.min(Math.max(Number(value.y), 1), 5) 
                 : 3;
        
        return { x, y };
      }
      
      return { x: 3, y: 3 };
    }
  },
  difficulty: {
    type: String,
    enum: ['easy', 'medium', 'hard'],
    default: 'medium',
  },
}, {
  collection: 'entries',
  toJSON: { getters: true }, // Apply getters when converting to JSON
  toObject: { getters: true } // Apply getters when converting to plain object
});

// Log when a document is about to be saved to debug position validation
ItemSchema.pre('save', function(next) {
  console.log('Saving Item with position:', this.get('position'));
  next();
});

// Use mongoose.models to check if the model already exists, otherwise create a new one
export default mongoose.models.Item || mongoose.model('Item', ItemSchema);
