"use client";

import * as React from 'react';
import {
    Dialog, DialogTitle, DialogContent, DialogActions,
    Button, Table, TableBody, TableCell, TableContainer,
    TableHead, TableRow, TableSortLabel, Paper,
    CircularProgress, TextField, Pagination, Select, MenuItem, Box
} from '@mui/material';
import { useSnackbar } from 'notistack';
import { t } from 'i18next';
import { smartdnsServer } from '@/lib/backend/server';
import type { DomainList, QueryLogsParams } from '@/lib/backend/server';

interface BlockedDomainsDialogProps {
    open: boolean;
    onClose: () => void;
}

export const BlockedDomainsDialog = React.memo(function BlockedDomainsDialog({ open, onClose }: BlockedDomainsDialogProps): React.JSX.Element {
    const { enqueueSnackbar } = useSnackbar();
    const [blockedDomains, setBlockedDomains] = React.useState<DomainList[]>([]);
    const [loading, setLoading] = React.useState(false);
    const [total, setTotal] = React.useState(0);
    const [page, setPage] = React.useState(1);
    const [rowsPerPage, setRowsPerPage] = React.useState(() => {
        const saved = localStorage.getItem('blocked-domains-rows-per-page');
        return saved ? Number.parseInt(saved, 10) : 20;
    });
    const [searchTerm, setSearchTerm] = React.useState('');
    const [order, setOrder] = React.useState<'asc' | 'desc'>('desc');
    const toggleOrder = () => setOrder(prev => prev === 'asc' ? 'desc' : 'asc');

    const fetchBlockedDomains = React.useCallback(async () => {
        setLoading(true);
        try {
            const params: QueryLogsParams = {
                page_num: page,
                page_size: rowsPerPage,
                is_blocked: true,
                order: order,
            };
            if (searchTerm) {
                params.domain = searchTerm;
                params.domain_filter_mode = 'contains';
            }
            const res = await smartdnsServer.GetQueryLogs(params);
            if (res.error) {
                enqueueSnackbar(t("Failed to fetch"), { variant: 'error' });
                return;
            }
            if (res.data) {
                setBlockedDomains(res.data.domain_list);
                setTotal(res.data.total_count);
            }
        } catch {
            enqueueSnackbar(t("Failed to fetch"), { variant: 'error' });
        } finally {
            setLoading(false);
        }
    }, [page, rowsPerPage, searchTerm, order, enqueueSnackbar]);

    React.useEffect(() => {
        if (rowsPerPage) {
            localStorage.setItem('blocked-domains-rows-per-page', String(rowsPerPage));
        }
    }, [rowsPerPage]);

    React.useEffect(() => {
        if (open) {
            fetchBlockedDomains();
        }
    }, [open, fetchBlockedDomains]);

    React.useEffect(() => {
        setPage(1);
    }, [searchTerm, order]);

    return (
        <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
            <DialogTitle>{t("Blocked Domains")}</DialogTitle>
            <DialogContent>
                <TextField
                    fullWidth
                    size="small"
                    placeholder={t("Search...")}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    sx={{ mb: 2 }}
                />
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                    <Select
                        value={rowsPerPage}
                        onChange={(e) => {
                            const newSize = Number(e.target.value);
                            setRowsPerPage(newSize);
                            setPage(1);
                        }}
                        size="small"
                    >
                        <MenuItem value={10}>10</MenuItem>
                        <MenuItem value={20}>20</MenuItem>
                        <MenuItem value={50}>50</MenuItem>
                        <MenuItem value={100}>100</MenuItem>
                    </Select>
                    <Pagination
                        count={Math.ceil(total / rowsPerPage)}
                        page={page}
                        onChange={(_, value) => setPage(value)}
                        color="primary"
                    />
                </Box>
                {loading ? (
                    <CircularProgress />
                ) : (
                    <TableContainer component={Paper}>
                        <Table size="small">
                            <TableHead>
                                <TableRow>
                                    <TableCell>{t("ID")}</TableCell>
                                    <TableCell>{t("Domain")}</TableCell>
                                    <TableCell>{t("Type")}</TableCell>
                                    <TableCell>
                                        <TableSortLabel
                                            active={true}
                                            direction={order}
                                            onClick={toggleOrder}
                                        >
                                            {t("Time")}
                                        </TableSortLabel>
                                    </TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {blockedDomains.map((item, index) => (
                                    <TableRow key={item.id}>
                                        <TableCell>{(page - 1) * rowsPerPage + index + 1}</TableCell>
                                        <TableCell>{item.domain}</TableCell>
                                        <TableCell>{item.domain_type}</TableCell>
                                        <TableCell>{new Date(item.timestamp).toLocaleString()}</TableCell>
                                    </TableRow>
                                ))}
                                {blockedDomains.length === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={4} align="center">{t("Not found")}</TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </TableContainer>
                )}
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose}>{t("Close")}</Button>
            </DialogActions>
        </Dialog>
    );
});
