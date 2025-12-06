"use client"

import * as React from 'react';
import { useMemo, useState } from 'react';
import {
  MaterialReactTable,
  useMaterialReactTable,
  type MRT_ColumnFilterFnsState as MRTColumnFilterFnsState,
  type MRT_ColumnDef as MRTColumnDef,
  type MRT_ColumnFiltersState as MRTColumnFiltersState,
  type MRT_PaginationState as MRTPaginationState,
  type MRT_SortingState as MRTSortingState,
  MRT_ActionMenuItem as MRTActionMenuItem,
  type MRT_Row as MRTRow,
  type MRT_Cell as MRTCell,
  type MRT_TableInstance as MRTTableInstance,
} from 'material-react-table';
import { Card, IconButton, Tooltip } from '@mui/material';
import { createTheme, useColorScheme } from '@mui/material/styles';
import RefreshIcon from '@mui/icons-material/Refresh';
import {
  QueryClient,
  QueryClientProvider,
  keepPreviousData,
  useQuery,
} from '@tanstack/react-query';

import { type ClientList, type QueryClientsParams, smartdnsServer } from '@/lib/backend/server';
import { useUser } from '@/hooks/use-user';
import { useTranslation } from 'react-i18next';
import { MRT_Localization_EN } from 'material-react-table/locales/en';
import { MRT_Localization_ZH_HANS } from 'material-react-table/locales/zh-Hans';
import i18n from '@/components/core/i18n';
import { Delete, Domain } from '@mui/icons-material';
import { type SnackbarOrigin, SnackbarProvider, useSnackbar } from 'notistack';


interface UserApiResponse {
  data: ClientList[];
  meta: {
    totalRowCount: number;
  };
};

interface PageCursor {
  pageNumber: number;
  firstID: number;
  lastID: number;
}

function TableClients(): React.JSX.Element {
  const { t } = useTranslation();

  const COLUMN_VISIBILITY_KEY = 'clients-table-column-visibility';
  const COLUMN_SIZING_KEY = 'clients-table-column-sizing';
  const PAGINATION_KEY = 'clients-table-pagination';

  const savedColumnVisibility = localStorage.getItem(COLUMN_VISIBILITY_KEY);
  const savedColumnSizing = localStorage.getItem(COLUMN_SIZING_KEY);
  const savedPagination = localStorage.getItem(PAGINATION_KEY);

  let jsonParsedColumnVisibility: Record<string, boolean> = {};
  let jsonParsedColumnSizing: Record<string, number> = {};
  let jsonParsedPagination: MRTPaginationState = { pageIndex: 0, pageSize: 10 };

  try {
    if (savedColumnVisibility) {
      jsonParsedColumnVisibility = JSON.parse(savedColumnVisibility) as Record<string, boolean>;
    }
  } catch {
    localStorage.removeItem(COLUMN_VISIBILITY_KEY);
    jsonParsedColumnVisibility = {};
  }

  try {
    if (savedColumnSizing) {
      jsonParsedColumnSizing = JSON.parse(savedColumnSizing) as Record<string, number>;
    }
  } catch {
    localStorage.removeItem(COLUMN_SIZING_KEY);
    jsonParsedColumnSizing = {};
  }

  try {
    if (savedPagination) {
      jsonParsedPagination = JSON.parse(savedPagination) as MRTPaginationState;
    }
  } catch {
    localStorage.removeItem(PAGINATION_KEY);
    jsonParsedPagination = { pageIndex: 0, pageSize: 10 };
  }

  const initialColumnVisibility = jsonParsedColumnVisibility || {};
  const [columnVisibility, setColumnVisibility] = React.useState(initialColumnVisibility);
  const [columnSizing, setColumnSizing] = React.useState(jsonParsedColumnSizing);

  const columns = useMemo<MRTColumnDef<ClientList>[]>(
    () => [
      {
        accessorKey: 'id',
        header: t('ID'),
        size: 110,
        enableColumnActions: false,
        columnFilterModeOptions: ['equals'],
      },
      {
        accessorKey: 'client_ip',
        header: t('Client IP'),
        size: 360,
        enableColumnActions: false,
        columnFilterModeOptions: ['contains', 'equals'],
      },
      {
        accessorKey: 'mac',
        header: t('Mac Address'),
        size: 240,
        enableColumnActions: false,
        columnFilterModeOptions: ['equals'],
      },
      {
        accessorKey: 'hostname',
        header: t('Host Name'),
        size: 250,
        enableColumnActions: false,
        columnFilterModeOptions: ['equals'],
      },
      {
        accessorKey: 'last_query_timestamp',
        header: t('Last Query Time'),
        Cell: ({ cell }) => {
          const timestamp = cell.getValue<string>();
          const localTime = new Date(timestamp).toLocaleString();
          return <span>{localTime}</span>;
        },
        columnFilterModeOptions: ['equals'],
        enableColumnActions: false,
        size: 120,
      },
    ],
    [t],
  );

  const { checkSessionError } = useUser();
  const [columnFilters, setColumnFilters] = useState<MRTColumnFiltersState>(
    [],
  );
  const [columnFilterFns, setColumnFilterFns] =
    useState<MRTColumnFilterFnsState>(
      () => Object.fromEntries(
        columns.map(({ accessorKey }) => {
          return [accessorKey, 'equals'];
        })
      ) as MRTColumnFilterFnsState
    );
  const [shouldFetchData, setShouldFetchData] = useState(false);
  const [globalFilter, setGlobalFilter] = useState('');
  const [errorMsg, setErrorMsg] = useState("Error loading data");
  const [sorting, setSorting] = useState<MRTSortingState>([]);
  const lastPage = React.useRef(0);
  const pageCursor = React.useRef<PageCursor | null>(null);
  const [pagination, setPagination] = useState<MRTPaginationState>(jsonParsedPagination);
  const [totalRowCount, setTotalRowCount] = useState(0);
  const totalCountFromParams = React.useRef(false);
  const [tableLocales, setTableLocales] = useState(MRT_Localization_EN);
  const { enqueueSnackbar } = useSnackbar();
  const [isActionAlignRight] = React.useState<boolean>(() => typeof window !== 'undefined' && window.innerWidth >= 1200);

  React.useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const filters: MRTColumnFiltersState = [];

    for (const [key, value] of searchParams.entries()) {
      if (!columns.some((column) => column.accessorKey === key)) {
        continue;
      }

      filters.push({ id: key, value });
    }

    setColumnFilters(filters);
    if (!shouldFetchData) {
      setShouldFetchData(true);
    }
  }, [shouldFetchData, columns]);

  const {
    data: { data = [], meta } = {},
    isError,
    isRefetching,
    isLoading,
    refetch,
  } = useQuery<UserApiResponse>({
    enabled: shouldFetchData,
    queryKey: [
      'table-data',
      columnFilterFns,
      columnFilters,
      globalFilter,
      pagination.pageIndex,
      pagination.pageSize,
      sorting,
    ],
    queryFn: async () => {
      const currentPageNumber = pagination.pageIndex + 1;
      const queryParam: QueryClientsParams = {
        'page_num': currentPageNumber,
        'page_size': pagination.pageSize,
      };

      if (totalCountFromParams.current) {
        totalCountFromParams.current = false;
        queryParam['total_count'] = totalRowCount;
      }

      if (pageCursor.current !== null && pageCursor.current !== undefined) {
        if (currentPageNumber > lastPage.current && currentPageNumber === lastPage.current + 1) {
          if (pageCursor.current.lastID >= 0) {
            queryParam['cursor'] = pageCursor.current.lastID;
            queryParam['total_count'] = totalRowCount;
            queryParam['cursor_direction'] = 'next';
          }
        } else if (currentPageNumber < lastPage.current && currentPageNumber === lastPage.current - 1) {
          if (pageCursor.current.firstID >= 0) {
            queryParam['cursor'] = pageCursor.current.firstID;
            queryParam['total_count'] = totalRowCount;
            queryParam['cursor_direction'] = 'prev';
          }
        }
      }

      lastPage.current = currentPageNumber;

      for (const filter of columnFilters) {
        if (filter.id === null || filter.id === undefined || filter.value === null || filter.value === undefined) {
          continue;
        }

        if (filter.id === 'last_query_timestamp') {
          const timerange = filter.value as string[];
          if (timerange.length === 2) {
            if (timerange[0]) {
              queryParam['timestamp_after'] = new Date(timerange[0]).getTime();
            }

            if (timerange[1]) {
              queryParam['timestamp_before'] = new Date(timerange[1]).getTime();
            }
          }
        }

        const filterId = filter.id as keyof QueryClientsParams;
        queryParam[filterId] = filter.value as string;
      }

      const data = await smartdnsServer.GetClients(queryParam);
      if (data.error) {
        await checkSessionError?.(data.error);
        setErrorMsg(smartdnsServer.getErrorMessage(data.error));
        throw new Error(errorMsg);
      }

      if (data.data === null || data.data === undefined) {
        setErrorMsg('Error loading data');
        throw new Error(errorMsg);
      }

      let totalCount = 0;
      if (data.data.total_count > 0 && data.data.client_list.length > 0) {
        const newPageCursor: PageCursor = {
          firstID: data.data.client_list[0].id,
          lastID: data.data.client_list.at(-1)!.id,
          pageNumber: currentPageNumber + 1,
        };

        pageCursor.current = newPageCursor;
        totalCount = data.data.total_count;
      }

      setTotalRowCount(totalCount);
      const resp: UserApiResponse = {
        data: data.data.client_list,
        meta: {
          totalRowCount: totalCount,
        },
      };

      return resp;
    },
    placeholderData: keepPreviousData,
  });

  React.useEffect(() => {
    if (i18n.language === null || i18n.language === undefined) {
      return;
    }

    if (i18n.language === 'zh-CN') {
      setTableLocales(MRT_Localization_ZH_HANS);
    } else {
      setTableLocales(MRT_Localization_EN);
    }
  }, []);

  const handleRowClientMacVendor = React.useCallback(async (_row: MRTRow<ClientList>) => {
    const msg = t('Not implemented yet.');

    enqueueSnackbar(msg, { style: { whiteSpace: 'pre-line' } });
  }, [t, enqueueSnackbar]);

  const handleRowDelete = React.useCallback(async (row: MRTRow<ClientList>) => {
    const id = row.original.id;
    const clientIP = row.original.client_ip;
    const ret = await smartdnsServer.DeleteClientById(id);
    if (ret.error) {
      enqueueSnackbar(`${t('Error')}: ${t(smartdnsServer.getErrorMessage(ret.error))}, id: ${id}`, { variant: 'error' });
      return;
    }

    enqueueSnackbar(t('Delete client {{id}} {{client_ip}} successfully.', { id, clientIP }), { variant: 'success' });
  }, [t, enqueueSnackbar]);

  const renderRowMenuItem = (closeMenu: () => void, row: MRTRow<ClientList>, table: MRTTableInstance<ClientList>): React.ReactNode[] => (
    [
      <MRTActionMenuItem
        icon={<Domain />}
        key="mac_vendor"
        label="Mac Vendor"
        onClick={async (e) => { e.preventDefault(); closeMenu(); await handleRowClientMacVendor(row); }}
        table={table}
      />,
      <MRTActionMenuItem
        icon={<Delete />}
        key="delete"
        label="Delete"
        onClick={async (e) => { e.preventDefault(); closeMenu(); await handleRowDelete(row); }}
        table={table}
      />,
    ]
  );

  const renderCellMenuItem = (closeMenu: () => void, _cell: MRTCell<ClientList>, row: MRTRow<ClientList>, table: MRTTableInstance<ClientList>): React.ReactNode[] => (
    [
      renderRowMenuItem(closeMenu, row, table),
    ]
  );

  const { colorScheme } = useColorScheme();
  const tableTheme = React.useMemo(
    () => createTheme({ palette: { mode: colorScheme === 'dark' ? 'dark' : 'light' } }),
    [colorScheme],
  );
  const baseBackgroundColor = tableTheme.palette.background.paper;

  const table = useMaterialReactTable({
    columns,
    data,
    localization: tableLocales,
    enableColumnResizing: true,
    enableSorting: false,
    enableColumnOrdering: true,
    enableRowActions: true,
    enableCellActions: true,
    enableClickToCopy: window.isSecureContext,
    enableGlobalFilter: false,
    columnFilterDisplayMode: 'popover',
    enableColumnFilterModes: true,
    enableColumnPinning: true,
    enableColumnDragging: false,
    enableKeyboardShortcuts: false,
    manualFiltering: true,
    manualPagination: true,
    manualSorting: true,
    muiFilterDateTimePickerProps: {
      ampm: false,
    },
    muiPaginationProps: {
      disabled: isRefetching,
    },
    muiToolbarAlertBannerProps: isError
      ? {
        color: 'error',
        children: errorMsg,
      }
      : undefined,
    onColumnFilterFnsChange: setColumnFilterFns,
    onColumnFiltersChange: (filters) => {
      setColumnFilters(filters);
    },
    onGlobalFilterChange: (filters: React.SetStateAction<string>) => {
      setGlobalFilter(filters);
    },
    onPaginationChange: (updaterOrValue) => {
      const newPagination =
        typeof updaterOrValue === 'function'
          ? updaterOrValue(pagination)
          : updaterOrValue;
      setPagination(newPagination);
      localStorage.setItem(PAGINATION_KEY, JSON.stringify(newPagination));
    },
    onSortingChange: setSorting,
    onColumnVisibilityChange: (updaterOrValue) => {
        setColumnVisibility((prev) => {
          const newVisibility =
              typeof updaterOrValue === 'function'
                  ? updaterOrValue(prev)
                  : updaterOrValue;
          localStorage.setItem(COLUMN_VISIBILITY_KEY, JSON.stringify(newVisibility));
          return newVisibility;
        });
    },
    onColumnSizingChange: (updaterOrValue) => {
      setColumnSizing((prev) => {
          const newSizing =
            typeof updaterOrValue === 'function'
              ? updaterOrValue(prev)
              : updaterOrValue;
          localStorage.setItem(COLUMN_SIZING_KEY, JSON.stringify(newSizing));
          return newSizing;
        });
    },
    renderTopToolbarCustomActions: () => (
      <Tooltip arrow title={t("Refresh Data")}>
        <span>
          <IconButton
            disabled={isRefetching}
            onClick={() => {
              refetch().catch((_error: unknown) => {
                // NOOP
              });
            }
            }>
            <RefreshIcon />
          </IconButton>
        </span>
      </Tooltip>
    ),
    renderRowActionMenuItems: ({ closeMenu, row, table }) => {
      return [
        renderRowMenuItem(closeMenu, row, table),
      ];
    },
    renderCellActionMenuItems: ({ closeMenu, cell, row, table, internalMenuItems }) => {
      return [
        renderCellMenuItem(closeMenu, cell, row, table),
        ...internalMenuItems,
      ];
    },
    muiLinearProgressProps: {
      color: 'primary',
      variant: 'determinate',
      value: isRefetching ? 50 : 100,
    },
    rowCount: meta?.totalRowCount ?? 0,
    initialState: {
      columnVisibility,
      columnSizing,
      columnPinning: {
        right: isActionAlignRight ? ['mrt-row-actions'] : [],
      },
    },
    state: {
      columnFilters,
      columnFilterFns,
      globalFilter,
      isLoading,
      pagination,
      columnVisibility,
      columnSizing,
      showAlertBanner: isError,
      showProgressBars: isRefetching,
      showSkeletons: isLoading,
      sorting,
    },
    mrtTheme: (_theme) => ({
      baseBackgroundColor,
    }),
  });

  return (<MaterialReactTable table={table} />);
};

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      gcTime: 0,
      retry: false,
    },
  },
});


export function ClientsTable(): React.JSX.Element {

  const [state, setState] = React.useState<SnackbarOrigin>({
    vertical: 'top',
    horizontal: 'left',
  });

  React.useEffect(() => {
    const mediaQuery = window.matchMedia('(max-width: 600px)');
    const handleMediaQueryChange = (event: MediaQueryListEvent): void => {
      if (event.matches) {
        setState({ vertical: 'top', horizontal: 'left' });
      } else {
        setState({ vertical: 'bottom', horizontal: 'left' });
      }
    };

    if (mediaQuery.matches) {
      setState({ vertical: 'top', horizontal: 'left' });
    } else {
      setState({ vertical: 'bottom', horizontal: 'left' });
    }

    mediaQuery.addEventListener('change', handleMediaQueryChange);

    return () => {
      mediaQuery.removeEventListener('change', handleMediaQueryChange);
    };
  }, [setState]);

  return (
    <QueryClientProvider client={queryClient}>
      <SnackbarProvider
        anchorOrigin={state}
        maxSnack={5} autoHideDuration={6000}>
        <Card>
          <TableClients />
        </Card>
      </SnackbarProvider>
    </QueryClientProvider>
  );
}
