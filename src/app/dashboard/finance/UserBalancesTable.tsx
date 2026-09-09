'use client';

import { DataTable, Column } from '@/components/ui/DataTable';
import { formatMoney } from '@/lib/format';

interface UserBalance {
    userId: string;
    userName: string;
    currentBalance: number;
}

interface UserBalancesTableProps {
    data: UserBalance[];
}

export default function UserBalancesTable({ data }: UserBalancesTableProps) {
    const columns: Column<UserBalance>[] = [
        {
            key: 'userName',
            header: 'User',
            sortable: true,
            render: (_, row) => (
                <div className="font-medium text-[var(--text-primary)]">{row.userName}</div>
            )
        },
        {
            key: 'currentBalance',
            header: 'Balance',
            sortable: true,
            render: (_, row) => (
                <span className={`font-mono font-medium ${row.currentBalance > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-cyan-600 dark:text-cyan-400'}`}>
                    {formatMoney(Math.abs(row.currentBalance))}
                </span>
            ),
        },
        {
            key: 'status',
            header: 'Status',
            render: (_, row) => {
                if (row.currentBalance > 0) {
                    return (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 uppercase tracking-wider">
                            Due
                        </span>
                    );
                }
                return (
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400 uppercase tracking-wider">
                        Credit
                    </span>
                );
            },
        },
    ];

    return (
        <DataTable
            data={data}
            keyField="userId"
            columns={columns}
        />
    );
}
