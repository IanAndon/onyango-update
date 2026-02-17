// 'use client';

// import React, { useState } from "react";
// import {
//   Table,
//   TableBody,
//   TableCell,
//   TableHeader,
//   TableRow,
// } from "@/components/ui/table"; // adjust path as needed
// import Badge from "@/components/ui/badge/Badge"; // adjust path as needed
// import { Button } from "@/components/ui/button"; // assuming shadcn or similar
// import { Plus } from "lucide-react";

// interface StockItem {
//   symbol: string;
//   name: string;
//   price: number;
//   high: number;
//   low: number;
//   status: "Up" | "Down" | "Stable";
// }

// const mockStocks: StockItem[] = [
//   { symbol: "AAPL", name: "Apple Inc.", price: 190.56, high: 193.21, low: 188.34, status: "Up" },
//   { symbol: "TSLA", name: "Tesla, Inc.", price: 256.73, high: 260.0, low: 250.5, status: "Down" },
//   { symbol: "MSFT", name: "Microsoft Corp.", price: 332.13, high: 334.4, low: 329.8, status: "Stable" },
//   { symbol: "AMZN", name: "Amazon.com Inc.", price: 142.23, high: 145.0, low: 140.7, status: "Up" },
// ];

// export default function StockPage() {
//   const [search, setSearch] = useState<string>("");

//   const filteredStocks = mockStocks.filter((stock) =>
//     stock.symbol.toLowerCase().includes(search.toLowerCase()) ||
//     stock.name.toLowerCase().includes(search.toLowerCase())
//   );

//   return (
//     <div className="space-y-6">
//       {/* Header and Actions */}
//       <div className="flex items-center justify-between">
//         <h2 className="text-xl font-bold">Stock List</h2>
//         <Button className="flex items-center gap-2">
//           <Plus size={16} /> Add Stock
//         </Button>
//       </div>

//       {/* Search */}
//       <div>
//         <input
//           type="text"
//           placeholder="Search by name or symbol..."
//           value={search}
//           onChange={(e) => setSearch(e.target.value)}
//           className="w-full max-w-md p-2 border rounded-md border-gray-300"
//         />
//       </div>

//       {/* Table */}
//       <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-white/[0.05] dark:bg-white/[0.03]">
//         <div className="max-w-full overflow-x-auto">
//           <div className="min-w-[900px]">
//             <Table>
//               <TableHeader>
//                 <TableRow>
//                   <TableCell isHeader className="px-5 py-3 font-medium text-start text-theme-xs text-gray-500 dark:text-gray-400">Symbol</TableCell>
//                   <TableCell isHeader className="px-5 py-3 font-medium text-start text-theme-xs text-gray-500 dark:text-gray-400">Company</TableCell>
//                   <TableCell isHeader className="px-5 py-3 font-medium text-start text-theme-xs text-gray-500 dark:text-gray-400">Price</TableCell>
//                   <TableCell isHeader className="px-5 py-3 font-medium text-start text-theme-xs text-gray-500 dark:text-gray-400">High</TableCell>
//                   <TableCell isHeader className="px-5 py-3 font-medium text-start text-theme-xs text-gray-500 dark:text-gray-400">Low</TableCell>
//                   <TableCell isHeader className="px-5 py-3 font-medium text-start text-theme-xs text-gray-500 dark:text-gray-400">Status</TableCell>
//                 </TableRow>
//               </TableHeader>
//               <TableBody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
//                 {filteredStocks.map((stock, index) => (
//                   <TableRow key={index}>
//                     <TableCell className="px-5 py-4 text-start text-theme-sm">{stock.symbol}</TableCell>
//                     <TableCell className="px-5 py-4 text-start text-theme-sm">{stock.name}</TableCell>
//                     <TableCell className="px-5 py-4 text-start text-theme-sm">${stock.price}</TableCell>
//                     <TableCell className="px-5 py-4 text-start text-theme-sm">${stock.high}</TableCell>
//                     <TableCell className="px-5 py-4 text-start text-theme-sm">${stock.low}</TableCell>
//                     <TableCell className="px-5 py-4 text-start text-theme-sm">
//                       <Badge
//                         size="sm"
//                         color={
//                           stock.status === "Up"
//                             ? "success"
//                             : stock.status === "Down"
//                             ? "error"
//                             : "warning"
//                         }
//                       >
//                         {stock.status}
//                       </Badge>
//                     </TableCell>
//                   </TableRow>
//                 ))}
//               </TableBody>
//             </Table>
//           </div>
//         </div>
//       </div>
//     </div>
//   );
// }
