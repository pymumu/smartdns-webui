"use client";

import * as React from 'react';
import {
    Dialog, DialogTitle, DialogContent, DialogActions,
    Button, Table, TableBody, TableCell, TableContainer,
    TableHead, TableRow, TableSortLabel, Paper,
    CircularProgress, TextField, Pagination, Select, MenuItem, Tooltip, Box
} from '@mui/material';
import { useSnackbar } from 'notistack';
import { t } from 'i18next';
import { smartdnsServer } from '@/lib/backend/server';
import type { CachedDomainInfo } from '@/lib/backend/server';

interface CachedDomainsDialogProps {
    open: boolean;
    onClose: () => void;
}

export const CachedDomainsDialog = React.memo(function CachedDomainsDialog({ open, onClose }: CachedDomainsDialogProps): React.JSX.Element {
    const { enqueueSnackbar } = useSnackbar();
    const [domainList, setDomainList] = React.useState<CachedDomainInfo[]>([]);
    const [loading, setLoading] = React.useState(false);
    const [order, setOrder] = React.useState<'asc' | 'desc'>('desc');
    const [orderBy, setOrderBy] = React.useState<'id' | 'domain' | 'qtype' | 'cached_time'>('id');
    const [searchTerm, setSearchTerm] = React.useState('');
    const [page, setPage] = React.useState(1);
    const [rowsPerPage, setRowsPerPage] = React.useState(() => {
        const saved = localStorage.getItem('cachedDomainsRowsPerPage');
        const parsed = saved ? Number.parseInt(saved, 10) : 20;
        return [10, 20, 50, 100].includes(parsed) ? parsed : 20;
    });

    React.useEffect(() => {
        localStorage.setItem('cachedDomainsRowsPerPage', rowsPerPage.toString());
    }, [rowsPerPage]);

    const handleSort = (property: typeof orderBy) => {
        const isAsc = orderBy === property && order === 'asc';
        setOrder(isAsc ? 'desc' : 'asc');
        setOrderBy(property);
    };

    const fetchDomains = React.useCallback(async () => {
        setLoading(true);
        try {
            const res = await smartdnsServer.GetCacheDomains();
            if (res.error) {
                enqueueSnackbar(t("Failed to load cache domains"), { variant: 'error' });
                onClose();
                return;
            }
            setDomainList(res.data || []);
        } catch {
            enqueueSnackbar(t("Failed to load cache domains"), { variant: 'error' });
            onClose();
        } finally {
            setLoading(false);
        }
    }, [enqueueSnackbar, onClose]);

    React.useEffect(() => {
        if (open) {
            fetchDomains();
        }
    }, [open, fetchDomains]);

    const sortedDomains = React.useMemo(() => {
        const searchLower = searchTerm.toLowerCase();
        const filtered = domainList.filter(item =>
            item.domain.toLowerCase().includes(searchLower) ||
            item.qtype.toString().includes(searchLower)
        );
        return filtered.toSorted((a, b) => {
            if (orderBy === 'id') return order === 'asc' ? a.id - b.id : b.id - a.id;
            if (orderBy === 'domain') return order === 'asc' ? a.domain.localeCompare(b.domain) : b.domain.localeCompare(a.domain);
            if (orderBy === 'qtype') return order === 'asc' ? a.qtype - b.qtype : b.qtype - a.qtype;
            if (orderBy === 'cached_time') return order === 'asc' ? a.cached_time - b.cached_time : b.cached_time - a.cached_time;
            return 0;
        });
    }, [domainList, order, orderBy, searchTerm]);

    const totalPages = React.useMemo(() => {
        return Math.max(1, Math.ceil(sortedDomains.length / rowsPerPage));
    }, [sortedDomains.length, rowsPerPage]);

    React.useEffect(() => {
        if (!loading && sortedDomains.length > 0 && page > totalPages) {
            setPage(totalPages);
        }
    }, [sortedDomains.length, page, rowsPerPage, totalPages, loading]);

    React.useEffect(() => {
        setPage(1);
    }, [searchTerm, order, orderBy, rowsPerPage]);

    const paginatedDomains = React.useMemo(() => {
        return sortedDomains.slice((page - 1) * rowsPerPage, page * rowsPerPage);
    }, [sortedDomains, page, rowsPerPage]);

    return (
        <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
            <DialogTitle>{t("Cached Domains")}</DialogTitle>
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
                        onChange={(e) => setRowsPerPage(Number(e.target.value))}
                        size="small"
                    >
                        <MenuItem value={10}>10</MenuItem>
                        <MenuItem value={20}>20</MenuItem>
                        <MenuItem value={50}>50</MenuItem>
                        <MenuItem value={100}>100</MenuItem>
                    </Select>
                    <Pagination
                        count={totalPages}
                        page={page}
                        onChange={(_, value) => setPage(value)}
                        color="primary"
                    />
                </Box>
                {loading ? (
                    <CircularProgress />
                ) : (
                    <TableContainer component={Paper}>
                        <Table size="small" sx={{ tableLayout: 'fixed', minWidth: 700 }}>
                            <TableHead>
                                <TableRow>
                                    <TableCell>
                                        <TableSortLabel
                                            active={orderBy === 'id'}
                                            direction={orderBy === 'id' ? order : 'asc'}
                                            onClick={() => handleSort('id')}
                                        >
                                            {t("ID")}
                                        </TableSortLabel>
                                    </TableCell>
                                    <TableCell sx={{ width: '48%', whiteSpace: 'normal' }}>
                                        <TableSortLabel
                                            active={orderBy === 'domain'}
                                            direction={orderBy === 'domain' ? order : 'asc'}
                                            onClick={() => handleSort('domain')}
                                        >
                                            {t("Domain")}
                                        </TableSortLabel>
                                    </TableCell>
                                    <TableCell sx={{ width: '10%', whiteSpace: 'nowrap' }}>
                                        <TableSortLabel
                                            active={orderBy === 'qtype'}
                                            direction={orderBy === 'qtype' ? order : 'asc'}
                                            onClick={() => handleSort('qtype')}
                                        >
                                            {t("Type")}
                                        </TableSortLabel>
                                    </TableCell>
                                    <TableCell sx={{ width: '20%', whiteSpace: 'nowrap' }}>
                                        <TableSortLabel
                                            active={orderBy === 'cached_time'}
                                            direction={orderBy === 'cached_time' ? order : 'asc'}
                                            onClick={() => handleSort('cached_time')}
                                        >
                                            {t("Time")}
                                        </TableSortLabel>
                                    </TableCell>
                                    <TableCell sx={{ width: '14%', whiteSpace: 'nowrap' }}>
                                        {t("TTL (s)")}
                                    </TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {paginatedDomains.map((item, index) => (
                                    <TableRow key={item.id}>
                                        <TableCell sx={{ width: '8%', whiteSpace: 'nowrap' }}>
                                            {index + 1 + (page - 1) * rowsPerPage}
                                        </TableCell>
                                        <Tooltip title={item.domain} arrow>
                                            <TableCell sx={{ width: '48%', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                {item.domain}
                                            </TableCell>
                                        </Tooltip>
                                        <TableCell sx={{ width: '10%', whiteSpace: 'nowrap' }}>{item.qtype}</TableCell>
                                        <TableCell sx={{ width: '20%', whiteSpace: 'nowrap' }}>
                                            {new Date(item.cached_time * 1000).toLocaleString()}
                                        </TableCell>
                                        <TableCell sx={{ width: '14%', whiteSpace: 'nowrap' }}>{item.ttl_remaining}</TableCell>
                                    </TableRow>
                                ))}
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
