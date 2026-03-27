"use client";

import * as React from 'react';
import Grid from '@mui/material/Grid';
import { MetricsCard } from '@/components/dashboard/overview/metrics-card';
import { type Mertrics, type CachedDomainInfo, type DomainList, type QueryLogsParams } from '@/lib/backend/server';
import { StreamLineChart } from './card-stream-linechart';
import { Alert, Box, Dialog, DialogTitle, DialogContent, DialogActions, Button, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TableSortLabel, Paper, CircularProgress, TextField, Pagination, Select, MenuItem } from '@mui/material';
import { size2str } from '@/lib/utils';
import TravelExploreOutlinedIcon from '@mui/icons-material/TravelExploreOutlined';
import BlockOutlinedIcon from '@mui/icons-material/BlockOutlined';
import SpeedOutlinedIcon from '@mui/icons-material/SpeedOutlined';
import MemoryOutlinedIcon from '@mui/icons-material/MemoryOutlined';
import AdsClickOutlinedIcon from '@mui/icons-material/AdsClickOutlined';
import AvTimerOutlinedIcon from '@mui/icons-material/AvTimerOutlined';
import DeleteSweepIcon from '@mui/icons-material/DeleteSweep';
import { useSnackbar } from 'notistack';
import { smartdnsServer } from '@/lib/backend/server';
import { t } from 'i18next';
import { AdaptiveNumber } from '@/components/common/adaptive-number';

const totalCards = [
    {
        accessor: 'total_query_count',
        title: 'Total Query Count',
        bgcolor: 'var(--mui-palette-dashboard-chartTotalQueries)',
        render: (value: number | string | boolean) => (
            <AdaptiveNumber value={value as number | string} />
        ),
        icon: TravelExploreOutlinedIcon,
    },
    {
        accessor: 'block_query_count',
        title: 'Blocked Query Count',
        bgcolor: 'var(--mui-palette-dashboard-chartBlockedQueries)',
        render: (value: number | string | boolean) => (
            <AdaptiveNumber value={value as number | string} />
        ),
        icon: BlockOutlinedIcon,
        onClick: undefined,
    },
    {
        accessor: 'qps',
        title: 'Query Per Second',
        bgcolor: 'var(--mui-palette-dashboard-chartQueryPerSecond)',
        render: (value: number | string | boolean, dataIndex?: number) => {
            return <StreamLineChart data={value as number} dataIndex={dataIndex || 0} />
        },
        icon: SpeedOutlinedIcon,
    },
    {
        accessor: 'cache_hit_rate',
        title: 'Cache Hit Rate',
        bgcolor: 'var(--mui-palette-dashboard-chartCacheHitRate)',
        render: (value: number | string | boolean) => {
            return <span>{value}%</span>
        },
        icon: AdsClickOutlinedIcon,
    },
    {
        accessor: 'cache_number',
        title: 'Cache Number',
        bgcolor: 'var(--mui-palette-dashboard-chartCacheNumber)',
        render: (value: number | string | boolean, dataIndex?: number, cardata?: unknown) => {
            if (!cardata || typeof cardata !== 'object') {
                return <span>{value}</span>
            }

            const metrics = cardata as Mertrics;
            const cacheSize = size2str(metrics?.cache_memory_size ?? "NA");
            return <Box><Box>{value}</Box>
                <Box sx={{ fontSize: '1rem' }}>
                    {cacheSize}
                </Box>
            </Box>
        },
        icon: MemoryOutlinedIcon,
        actionButton: {
            icon: DeleteSweepIcon,
            tooltip: 'Clear Cache',
            loadingStateKey: 'clearingCache',
            onClick: (cardMessage: (msg: string) => void, setLoading: (loading: boolean) => void) => {
                setLoading(true);
                smartdnsServer.FlushCache().then((res) => {
                    if (res.error) {
                        cardMessage(t("Clear Cache Failed"));
                        setLoading(false);
                        return;
                    }
                    cardMessage(t("Clear Cache Success"));
                    setLoading(false);
                }

                ).catch(() => {
                    cardMessage(t("Clear Cache Failed"));
                    setLoading(false);
                });
            },
            loading: false,
        },
        onClick: undefined,
    },
    {
        accessor: 'avg_query_time',
        title: 'Average Query Time',
        bgcolor: 'var(--mui-palette-dashboard-chartAverageQueryTime)',
        render: (value: number | string | boolean) => {
            return <span>{value} ms</span>
        },
        icon: AvTimerOutlinedIcon,
    },
]

export function MetricsCards(): React.JSX.Element {
    const [cardata, setCardData] = React.useState<Mertrics | null>(null);
    const [loading, setLoading] = React.useState<boolean>(true);
    const [dataIndex, setDataIndex] = React.useState<number>(0);
    const [dialogOpen, setDialogOpen] = React.useState<boolean>(false);
    const [domainList, setDomainList] = React.useState<CachedDomainInfo[]>([]);
    const [order, setOrder] = React.useState<'asc' | 'desc'>('desc');
    const [orderBy, setOrderBy] = React.useState<'id' | 'domain' | 'qtype'>('id');
    const [loadingDomains, setLoadingDomains] = React.useState<boolean>(false);
    const [searchTerm, setSearchTerm] = React.useState<string>('');
    const [page, setPage] = React.useState<number>(1);
    const [rowsPerPage, setRowsPerPage] = React.useState<number>(20);
    const reconnectTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);
    const [blockedDialogOpen, setBlockedDialogOpen] = React.useState<boolean>(false);
    const [blockedDomains, setBlockedDomains] = React.useState<DomainList[]>([]);
    const [blockedLoading, setBlockedLoading] = React.useState<boolean>(false);
    const [blockedTotal, setBlockedTotal] = React.useState<number>(0);
    const [blockedPage, setBlockedPage] = React.useState<number>(1);
    const [blockedRowsPerPage, setBlockedRowsPerPage] = React.useState<number>(20);
    const [blockedSearchTerm, setBlockedSearchTerm] = React.useState<string>('');
    const [blockedOrder, setBlockedOrder] = React.useState<'asc' | 'desc'>('desc');
    const toggleBlockedOrder = () => {setBlockedOrder(prev => prev === 'asc' ? 'desc' : 'asc');};
    const socketRef = React.useRef<WebSocket | null>(null);
    const doClose = React.useRef<boolean>(false);
    const { enqueueSnackbar } = useSnackbar();
    const [isSuspended, setIsSuspended] = React.useState<boolean>(false);
    const connectRef = React.useRef<() => void>(() => { /* will be set below */ });

    function close(): void {
        if (reconnectTimeoutRef.current) {
            clearTimeout(reconnectTimeoutRef.current);
            reconnectTimeoutRef.current = null;
        }

        if (socketRef.current) {
            socketRef.current.close();
            socketRef.current = null;
        }
    }

    const cardMessage = React.useCallback(async (msg: string) => {
        enqueueSnackbar(msg, { style: { whiteSpace: 'pre-line' } });
    }, [enqueueSnackbar]);

    const handleSort = (property: typeof orderBy) => {
        const isAsc = orderBy === property && order === 'asc';
        setOrder(isAsc ? 'desc' : 'asc');
        setOrderBy(property);
    };

    const handleViewCacheDomains = React.useCallback(async () => {
        setDialogOpen(true);
        setLoadingDomains(true);
        try {
            const res = await smartdnsServer.GetCacheDomains();
            if (res.error) {
                enqueueSnackbar(t("Failed to load cache domains"), { variant: 'error' });
                setDialogOpen(false);
                return;
            }
            setDomainList(res.data || []);
        } catch {
            enqueueSnackbar(t("Failed to load cache domains"), { variant: 'error' });
            setDialogOpen(false);
        } finally {
            setLoadingDomains(false);
        }
    }, [enqueueSnackbar]);

    const sortedDomains = React.useMemo(() => {
        const searchLower = searchTerm.toLowerCase();
        const filtered = domainList.filter(item => item.domain.toLowerCase().includes(searchLower) || item.qtype.toString().includes(searchLower));
        return filtered.toSorted((a, b) => {
            if (orderBy === 'id') return order === 'asc' ? a.id - b.id : b.id - a.id;
            if (orderBy === 'domain') return order === 'asc' ? a.domain.localeCompare(b.domain) : b.domain.localeCompare(a.domain);
            return order === 'asc' ? a.qtype - b.qtype : b.qtype - a.qtype;
        });
    }, [domainList, order, orderBy, searchTerm]);

    React.useEffect(() => {
        setPage(1);
    }, [searchTerm, order, orderBy, rowsPerPage]);

    const paginatedDomains = React.useMemo(() => {
        return sortedDomains.slice((page - 1) * rowsPerPage, page * rowsPerPage);
    }, [sortedDomains, page, rowsPerPage]);

    const fetchBlockedDomains = React.useCallback(async () => {
        setBlockedLoading(true);
        try {
            const params: QueryLogsParams = {
                page_num: blockedPage,
                page_size: blockedRowsPerPage,
                is_blocked: true,
                order: blockedOrder,
            };
            if (blockedSearchTerm) {
                params.domain = blockedSearchTerm;
                params.domain_filter_mode = 'contains';
            }
            const res = await smartdnsServer.GetQueryLogs(params);
            if (res.error) {
                enqueueSnackbar(t("Failed to fetch"), { variant: 'error' });
                return;
            }
            if (res.data) {
                setBlockedDomains(res.data.domain_list);
                setBlockedTotal(res.data.total_count);
            }
        } catch {
            enqueueSnackbar(t("Failed to fetch"), { variant: 'error' });
        } finally {
            setBlockedLoading(false);
        }
    }, [blockedPage, blockedRowsPerPage, blockedSearchTerm, blockedOrder, enqueueSnackbar]);

    React.useEffect(() => {
        if (blockedDialogOpen) {
            fetchBlockedDomains();
        }
    }, [blockedDialogOpen, blockedPage, blockedRowsPerPage, blockedSearchTerm, blockedOrder, fetchBlockedDomains]);

    const handleViewBlockedDomains = React.useCallback(() => {
        setBlockedDialogOpen(true);
        setBlockedPage(1);
        setBlockedSearchTerm('');
        setBlockedOrder('desc');
    }, []);

    const connect = React.useCallback((): void => {
        const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
        const socket = new WebSocket(`${protocol}://${window.location.host}/api/stats/metrics`);
        socketRef.current = socket;
        socket.onopen = () => {
            setLoading(false);
        }

        socket.onmessage = (event: MessageEvent) => {
            try {
                const data = JSON.parse(event.data as string) as Mertrics;
                setDataIndex(prevIndex => prevIndex + 1);
                setCardData(data);
                setIsSuspended(data.is_metrics_suspended);
            } catch {
                // NOOP
            }
        }

        socket.onclose = (_event: CloseEvent) => {
            if (doClose.current) {
                doClose.current = false;
                return;
            }

            reconnectTimeoutRef.current = setTimeout(function reconnect() {
                close();
                connectRef.current();
            }, 3000);
        }
    }, []);

    React.useEffect(() => {
        const blockedCard = totalCards.find(card => card.accessor === 'block_query_count');
        if (blockedCard) {
            (blockedCard as { onClick?: () => void }).onClick = handleViewBlockedDomains;
        }
    }, [handleViewBlockedDomains]);

    React.useEffect(() => {
        const cacheCard = totalCards.find(card => card.accessor === 'cache_number');
        if (cacheCard) {
            (cacheCard as { onClick?: () => void }).onClick = handleViewCacheDomains;
        }
    }, [handleViewCacheDomains]);

    React.useEffect(() => {
        connectRef.current = connect;
    }, [connect]);

    React.useEffect(() => {
        connectRef.current();
        return (): void => {
            doClose.current = true;
            close();
        }
    }, [connect]);

    return (
        <Box>
            {isSuspended ? <Grid>
                <Box sx={{ height: '60px' }}>
                    <Alert severity="error">{t("Server request processing has been suspended, please check whether there is enough disk space.")}</Alert>
                </Box>
            </Grid> : null}
            <Grid container spacing={2} sx={{ height: '100%', width: 'calc(100%)' }}>
                {totalCards.map((card, _index) => (
                    <Grid size={{ lg: 4, xl: 2, md: 4, xs: 6 }} key={card.accessor}>
                        <MetricsCard title={card.title}
                            isloading={loading}
                            icon={card.icon}
                            onClick={card.onClick ?? undefined}
                            value={cardata?.[card.accessor] ?? 0}
                            bgcolor={card.bgcolor}
                            render={card.render}
                            dataIndex={dataIndex}
                            cardata={cardata}
                            actionButton={card.actionButton}
                            cardMessage={cardMessage} />
                    </Grid>
                ))
                }
            </Grid>
            <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="md" fullWidth>
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
                            count={Math.ceil(sortedDomains.length / rowsPerPage)}
                            page={page}
                            onChange={(_, value) => setPage(value)}
                            color="primary"
                        />
                    </Box>
                    {loadingDomains ? (
                        <CircularProgress />
                    ) : (
                        <TableContainer component={Paper}>
                            <Table size="small">
                                <TableHead>
                                    <TableRow>
                                        <TableCell>
                                            <TableSortLabel active={orderBy === 'id'} direction={orderBy === 'id' ? order : 'asc'} onClick={() => handleSort('id')}>
                                                {t("ID")}
                                            </TableSortLabel>
                                        </TableCell>
                                        <TableCell>
                                            <TableSortLabel active={orderBy === 'domain'} direction={orderBy === 'domain' ? order : 'asc'} onClick={() => handleSort('domain')}>
                                                {t("Domain")}
                                            </TableSortLabel>
                                        </TableCell>
                                        <TableCell>
                                            <TableSortLabel active={orderBy === 'qtype'} direction={orderBy === 'qtype' ? order : 'asc'} onClick={() => handleSort('qtype')}>
                                                {t("Type")}
                                            </TableSortLabel>
                                        </TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {paginatedDomains.map((item, index) => (
                                        <TableRow key={item.id}>
                                            <TableCell>{index + 1 + (page - 1) * rowsPerPage}</TableCell>
                                            <TableCell>{item.domain}</TableCell>
                                            <TableCell>{item.qtype}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setDialogOpen(false)}>{t("Close")}</Button>
                </DialogActions>
            </Dialog>
            <Dialog open={blockedDialogOpen} onClose={() => setBlockedDialogOpen(false)} maxWidth="lg" fullWidth>
                <DialogTitle>{t("Blocked Domains")}</DialogTitle>
                <DialogContent>
                    <TextField
                        fullWidth
                        size="small"
                        placeholder={t("Search...")}
                        value={blockedSearchTerm}
                        onChange={(e) => setBlockedSearchTerm(e.target.value)}
                        sx={{ mb: 2 }}
                    />
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                        <Select
                            value={blockedRowsPerPage}
                            onChange={(e) => setBlockedRowsPerPage(Number(e.target.value))}
                            size="small"
                        >
                            <MenuItem value={10}>10</MenuItem>
                            <MenuItem value={20}>20</MenuItem>
                            <MenuItem value={50}>50</MenuItem>
                            <MenuItem value={100}>100</MenuItem>
                        </Select>
                        <Pagination
                            count={Math.ceil(blockedTotal / blockedRowsPerPage)}
                            page={blockedPage}
                            onChange={(_, value) => setBlockedPage(value)}
                            color="primary"
                        />
                    </Box>
                    {blockedLoading ? (
                        <CircularProgress />
                    ) : (
                        <TableContainer component={Paper}>
                            <Table size="small">
                                <TableHead>
                                    <TableRow>
                                        <TableCell>
                                            {t("ID")}
                                        </TableCell>
                                        <TableCell>
                                            {t("Domain")}
                                        </TableCell>
                                        <TableCell>
                                            {t("Type")}
                                        </TableCell>
                                        <TableCell>
                                            <TableSortLabel
                                                active={true}
                                                direction={blockedOrder}
                                                onClick={toggleBlockedOrder}
                                            >
                                                {t("Time")}
                                            </TableSortLabel>
                                        </TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {blockedDomains.map((item, index) => (
                                        <TableRow key={item.id}>
                                            <TableCell>{(blockedPage - 1) * blockedRowsPerPage + index + 1}</TableCell>
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
                    <Button onClick={() => setBlockedDialogOpen(false)}>{t("Close")}</Button>
                </DialogActions>
            </Dialog>
        </Box >
    );
}
