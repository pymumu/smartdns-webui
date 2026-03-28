"use client";

import * as React from 'react';
import Grid from '@mui/material/Grid';
import { MetricsCard } from '@/components/dashboard/overview/metrics-card';
import { type Mertrics } from '@/lib/backend/server';
import { StreamLineChart } from './card-stream-linechart';
import { Alert, Box } from '@mui/material';
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
import { CachedDomainsDialog } from './cached-domains-dialog';
import { BlockedDomainsDialog } from './blocked-domains-dialog';

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
    const [cacheDialogOpen, setCacheDialogOpen] = React.useState<boolean>(false);
    const [blockedDialogOpen, setBlockedDialogOpen] = React.useState<boolean>(false);
    const reconnectTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);
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

    const handleCloseCacheDialog = React.useCallback(() => {
        setCacheDialogOpen(false);
    }, []);

    const handleCloseBlockedDialog = React.useCallback(() => {
        setBlockedDialogOpen(false);
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
            (blockedCard as { onClick?: () => void }).onClick = () => setBlockedDialogOpen(true);
        }
    }, []);

    React.useEffect(() => {
        const cacheCard = totalCards.find(card => card.accessor === 'cache_number');
        if (cacheCard) {
            (cacheCard as { onClick?: () => void }).onClick = () => setCacheDialogOpen(true);
        }
    }, []);

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
            <CachedDomainsDialog open={cacheDialogOpen} onClose={handleCloseCacheDialog} />
            <BlockedDomainsDialog open={blockedDialogOpen} onClose={handleCloseBlockedDialog} />
        </Box >
    );
}
