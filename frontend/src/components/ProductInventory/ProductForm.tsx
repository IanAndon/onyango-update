'use client';

import React from 'react';
import Input from '@/components/form/input/InputField';
import Label from '@/components/form/Label';
import Select from '@/components/form/Select';

interface ProductFormProps {
  values: {
    name: string;
    category: string;
    buying_price: string;
    retail_price: string;
    wholesale_price: string;
    threshold: string;
  };
  categories: string[]; // or objects if you have category objects
  onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void;
}

export default function ProductForm1({ values, categories, onChange }: ProductFormProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div>
        <Label>Product Name</Label>
        <Input
          name="name"
          value={values.name}
          onChange={onChange}
        />
      </div>

      <div>
        <Label>Category</Label>
        <Select
          value={values.category}
          onChange={(value: string) => {
            // Create a synthetic event to match your onChange signature
            onChange({
              target: {
                name: "category",
                value: value
              }
            } as React.ChangeEvent<HTMLInputElement | HTMLSelectElement>);
          }}
          options={[
            { value: "", label: "Select category" },
            ...categories.map((cat: any) => ({
              value: cat.id || cat,
              label: cat.name || cat
            }))
          ]}
        />
      </div>

      <div>
        <Label>Buying Price</Label>
        <Input
          name="buying_price"
          type="number"
          value={values.buying_price}
          onChange={onChange}
        />
      </div>

      <div>
        <Label>Retail Price</Label>
        <Input
          name="retail_price"
          type="number"
          value={values.retail_price}
          onChange={onChange}
        />
      </div>

      <div>
        <Label>Wholesale Price</Label>
        <Input
          name="wholesale_price"
          type="number"
          value={values.wholesale_price}
          onChange={onChange}
        />
      </div>

      <div>
        <Label>Low Stock Threshold</Label>
        <Input
          name="threshold"
          type="number"
          value={values.threshold}
          onChange={onChange}
        />
      </div>
    </div>
  );
}
