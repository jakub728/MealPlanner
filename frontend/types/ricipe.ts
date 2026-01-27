export interface Recipe {
  _id: string;
  title: string;
  description: string;
  instructions: string[];
  status: 'private' | 'pending' | 'public';
  author: {
    _id: string;
    name: string;
  };

}