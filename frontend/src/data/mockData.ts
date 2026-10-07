export type Product = {
  id: number;
  title: string;
  price: number;
  category: string;
  condition: string;
  description: string;
  sellerName: string;
};

export const mockProducts: Product[] = [
  { 
    id: 1, 
    title: 'Harry Potter', 
    price: 12000, 
    category: 'Books', 
    condition: 'Used - Good', 
    description: 'Clean copy with minor notes in two chapters. Great for first-year literature courses. Pickup near main campus library.', 
    sellerName: 'Aruzhan S.' 
  },
  { 
    id: 2, 
    title: 'Logitech MX Keys Mini', 
    price: 35000, 
    category: 'Electronics', 
    condition: 'Good', 
    description: 'Works perfectly, selling because I upgraded to a mechanical keyboard.', 
    sellerName: 'Dias M.' 
  },
  { 
    id: 3, 
    title: 'IKEA study chair', 
    price: 18500, 
    category: 'Furniture', 
    condition: 'Used', 
    description: 'Standard dorm chair, moving out sale. Very comfortable.', 
    sellerName: 'Kamila T.' 
  },
  { 
    id: 4, 
    title: 'Data Structures textbook', 
    price: 10500, 
    category: 'Books', 
    condition: 'Good', 
    description: 'Required for CS201. No missing pages.', 
    sellerName: 'Alisher B.' 
  },
  { 
    id: 5, 
    title: 'Uni hoodie, size M', 
    price: 9000, 
    category: 'Clothes', 
    condition: 'Like new', 
    description: 'Worn twice, wrong size for me.', 
    sellerName: 'Aibar K.' 
  },
  { 
    id: 5, 
    title: 'Uni hoodie, size M', 
    price: 9000, 
    category: 'Clothes', 
    condition: 'Like new', 
    description: 'Worn twice, wrong size for me.', 
    sellerName: 'Aibar K.' 
  }
];