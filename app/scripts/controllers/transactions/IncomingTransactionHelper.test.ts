import { NetworkType } from '@metamask/controller-utils';
import type { BlockTracker, NetworkState } from '@metamask/network-controller';

import {
  TransactionMeta,
  TransactionStatus,
} from '../../../../shared/constants/transaction';
import { IncomingTransactionHelper } from './IncomingTransactionHelper';
import { RemoteTransactionSource } from './types';

jest.mock('@metamask/controller-utils', () => ({
  ...jest.requireActual('@metamask/controller-utils'),
  isSmartContractCode: jest.fn(),
  query: () => Promise.resolve({}),
}));

const NETWORK_STATE_MOCK: NetworkState = {
  providerConfig: {
    chainId: '0x1',
    type: NetworkType.mainnet,
  },
  networkId: '1',
} as unknown as NetworkState;

const ADDERSS_MOCK = '0x1';
const FROM_BLOCK_HEX_MOCK = '0x20';
const FROM_BLOCK_DECIMAL_MOCK = 32;

const BLOCK_TRACKER_MOCK = {
  addListener: jest.fn(),
  removeListener: jest.fn(),
} as unknown as jest.Mocked<BlockTracker>;

const CONTROLLER_ARGS_MOCK = {
  blockTracker: BLOCK_TRACKER_MOCK,
  getCurrentAccount: () => ADDERSS_MOCK,
  getNetworkState: () => NETWORK_STATE_MOCK,
  remoteTransactionSource: {} as RemoteTransactionSource,
  transactionLimit: 1,
};

const TRANSACTION_MOCK: TransactionMeta = {
  blockNumber: '123',
  chainId: '0x1',
  hash: '0x1',
  status: TransactionStatus.submitted,
  time: 0,
  txParams: { to: '0x1' },
} as unknown as TransactionMeta;

const TRANSACTION_MOCK_2: TransactionMeta = {
  blockNumber: '234',
  chainId: '0x1',
  hash: '0x2',
  time: 1,
  txParams: { to: '0x1' },
} as unknown as TransactionMeta;

const createRemoteTransactionSourceMock = (
  remoteTransactions: TransactionMeta[],
  {
    isSupportedNetwork,
    error,
  }: { isSupportedNetwork?: boolean; error?: boolean } = {},
): RemoteTransactionSource => ({
  isSupportedNetwork: jest.fn(() => isSupportedNetwork ?? true),
  fetchTransactions: jest.fn(() =>
    error
      ? Promise.reject(new Error('Test Error'))
      : Promise.resolve(remoteTransactions),
  ),
});

async function emitBlockTrackerLatestEvent(
  helper: IncomingTransactionHelper,
  { start, error }: { start?: boolean; error?: boolean } = {},
) {
  const transactionsListener = jest.fn();
  const blockNumberListener = jest.fn();

  if (error) {
    transactionsListener.mockImplementation(() => {
      throw new Error('Test Error');
    });
  }

  helper.hub.addListener('updatedTransactions', transactionsListener);
  helper.hub.addListener('updatedLastFetchedBlockNumbers', blockNumberListener);

  if (start !== false) {
    helper.start();
  }

  await BLOCK_TRACKER_MOCK.addListener.mock.calls[0]?.[1]?.(
    FROM_BLOCK_HEX_MOCK,
  );

  return {
    transactions: transactionsListener.mock.calls[0]?.[0],
    lastFetchBlockNumbers: blockNumberListener.mock.calls[0]?.[0],
    transactionsListener,
    blockNumberListener,
  };
}

describe('IncomingTransactionHelper', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  describe('on block tracker latest event', () => {
    it('handles errors', async () => {
      const helper = new IncomingTransactionHelper({
        ...CONTROLLER_ARGS_MOCK,
        remoteTransactionSource: createRemoteTransactionSourceMock([
          TRANSACTION_MOCK_2,
        ]),
      });

      await emitBlockTrackerLatestEvent(helper, { error: true });
    });

    describe('fetches remote transactions', () => {
      it('using remote transaction source', async () => {
        const remoteTransactionSource = createRemoteTransactionSourceMock([]);

        const helper = new IncomingTransactionHelper({
          ...CONTROLLER_ARGS_MOCK,
          remoteTransactionSource,
        });

        await emitBlockTrackerLatestEvent(helper);

        expect(remoteTransactionSource.fetchTransactions).toHaveBeenCalledTimes(
          1,
        );

        expect(remoteTransactionSource.fetchTransactions).toHaveBeenCalledWith({
          address: ADDERSS_MOCK,
          currentChainId: NETWORK_STATE_MOCK.providerConfig.chainId,
          currentNetworkId: NETWORK_STATE_MOCK.networkId,
          fromBlock: expect.any(Number),
          limit: CONTROLLER_ARGS_MOCK.transactionLimit,
        });
      });

      it('using from block as latest block minus ten if no last fetched data', async () => {
        const remoteTransactionSource = createRemoteTransactionSourceMock([]);

        const helper = new IncomingTransactionHelper({
          ...CONTROLLER_ARGS_MOCK,
          remoteTransactionSource,
        });

        await emitBlockTrackerLatestEvent(helper);

        expect(remoteTransactionSource.fetchTransactions).toHaveBeenCalledTimes(
          1,
        );

        expect(remoteTransactionSource.fetchTransactions).toHaveBeenCalledWith(
          expect.objectContaining({
            fromBlock: FROM_BLOCK_DECIMAL_MOCK - 10,
          }),
        );
      });

      it('using from block as last fetched value plus one', async () => {
        const remoteTransactionSource = createRemoteTransactionSourceMock([]);

        const helper = new IncomingTransactionHelper({
          ...CONTROLLER_ARGS_MOCK,
          remoteTransactionSource,
          lastFetchedBlockNumbers: {
            [`${NETWORK_STATE_MOCK.providerConfig.chainId}#${ADDERSS_MOCK}`]:
              FROM_BLOCK_DECIMAL_MOCK,
          },
        });

        await emitBlockTrackerLatestEvent(helper);

        expect(remoteTransactionSource.fetchTransactions).toHaveBeenCalledTimes(
          1,
        );

        expect(remoteTransactionSource.fetchTransactions).toHaveBeenCalledWith(
          expect.objectContaining({
            fromBlock: FROM_BLOCK_DECIMAL_MOCK + 1,
          }),
        );
      });
    });

    describe('emits updatedTransactions event', () => {
      it('if new transaction fetched', async () => {
        const helper = new IncomingTransactionHelper({
          ...CONTROLLER_ARGS_MOCK,
          remoteTransactionSource: createRemoteTransactionSourceMock([
            TRANSACTION_MOCK_2,
          ]),
          getLocalTransactions: () => [TRANSACTION_MOCK],
        });

        const { transactions } = await emitBlockTrackerLatestEvent(helper);

        expect(transactions).toStrictEqual([
          TRANSACTION_MOCK,
          TRANSACTION_MOCK_2,
        ]);
      });

      it('if existing transaction fetched with different status', async () => {
        const updatedTransaction = {
          ...TRANSACTION_MOCK,
          status: TransactionStatus.confirmed,
        } as TransactionMeta;

        const helper = new IncomingTransactionHelper({
          ...CONTROLLER_ARGS_MOCK,
          remoteTransactionSource: createRemoteTransactionSourceMock([
            updatedTransaction,
          ]),
          getLocalTransactions: () => [TRANSACTION_MOCK],
        });

        const { transactions } = await emitBlockTrackerLatestEvent(helper);

        expect(transactions).toStrictEqual([updatedTransaction]);
      });

      it('sorted by time in ascending order', async () => {
        const firstTransaction = { ...TRANSACTION_MOCK_2, time: 5 };
        const secondTransaction = { ...TRANSACTION_MOCK, time: 6 };

        const helper = new IncomingTransactionHelper({
          ...CONTROLLER_ARGS_MOCK,
          remoteTransactionSource: createRemoteTransactionSourceMock([
            firstTransaction,
          ]),
          getLocalTransactions: () => [secondTransaction],
        });

        const { transactions } = await emitBlockTrackerLatestEvent(helper);

        expect(transactions).toStrictEqual([
          firstTransaction,
          secondTransaction,
        ]);
      });

      it('does not if disabled', async () => {
        const helper = new IncomingTransactionHelper({
          ...CONTROLLER_ARGS_MOCK,
          remoteTransactionSource: createRemoteTransactionSourceMock([
            TRANSACTION_MOCK,
          ]),
          isEnabled: jest
            .fn()
            .mockReturnValueOnce(true)
            .mockReturnValueOnce(false),
        });

        const { transactionsListener } = await emitBlockTrackerLatestEvent(
          helper,
        );

        expect(transactionsListener).not.toHaveBeenCalled();
      });

      it('does not if current network is not supported by remote transaction source', async () => {
        const helper = new IncomingTransactionHelper({
          ...CONTROLLER_ARGS_MOCK,
          remoteTransactionSource: createRemoteTransactionSourceMock(
            [TRANSACTION_MOCK],
            { isSupportedNetwork: false },
          ),
        });

        const { transactionsListener } = await emitBlockTrackerLatestEvent(
          helper,
        );

        expect(transactionsListener).not.toHaveBeenCalled();
      });

      it('does not if no remote transactions', async () => {
        const helper = new IncomingTransactionHelper({
          ...CONTROLLER_ARGS_MOCK,
          remoteTransactionSource: createRemoteTransactionSourceMock([]),
        });

        const { transactionsListener } = await emitBlockTrackerLatestEvent(
          helper,
        );

        expect(transactionsListener).not.toHaveBeenCalled();
      });

      it('does not if incoming only and no incoming transactions', async () => {
        const helper = new IncomingTransactionHelper({
          ...CONTROLLER_ARGS_MOCK,
          remoteTransactionSource: createRemoteTransactionSourceMock([
            { ...TRANSACTION_MOCK, txParams: { to: '0x2' } } as TransactionMeta,
          ]),
          incomingOnly: true,
        });

        const { transactionsListener } = await emitBlockTrackerLatestEvent(
          helper,
        );

        expect(transactionsListener).not.toHaveBeenCalled();
      });

      it('does not if error fetching transactions', async () => {
        const helper = new IncomingTransactionHelper({
          ...CONTROLLER_ARGS_MOCK,
          remoteTransactionSource: createRemoteTransactionSourceMock(
            [TRANSACTION_MOCK],
            { error: true },
          ),
        });

        const { transactionsListener } = await emitBlockTrackerLatestEvent(
          helper,
        );

        expect(transactionsListener).not.toHaveBeenCalled();
      });

      it('does not if not started', async () => {
        const helper = new IncomingTransactionHelper({
          ...CONTROLLER_ARGS_MOCK,
          remoteTransactionSource: createRemoteTransactionSourceMock([
            TRANSACTION_MOCK,
          ]),
        });

        const { transactionsListener } = await emitBlockTrackerLatestEvent(
          helper,
          { start: false },
        );

        expect(transactionsListener).not.toHaveBeenCalled();
      });
    });

    describe('emits updatedLastFetchedBlockNumbers event', () => {
      it('if fetched transaction has higher block number', async () => {
        const helper = new IncomingTransactionHelper({
          ...CONTROLLER_ARGS_MOCK,
          remoteTransactionSource: createRemoteTransactionSourceMock([
            TRANSACTION_MOCK_2,
          ]),
          getLocalTransactions: () => [TRANSACTION_MOCK],
        });

        const { lastFetchBlockNumbers } = await emitBlockTrackerLatestEvent(
          helper,
        );

        expect(lastFetchBlockNumbers).toStrictEqual({
          [`${NETWORK_STATE_MOCK.providerConfig.chainId}#${ADDERSS_MOCK}`]:
            parseInt(TRANSACTION_MOCK_2.blockNumber as string, 10),
        });
      });

      it('does not if no fetched transactions', async () => {
        const helper = new IncomingTransactionHelper({
          ...CONTROLLER_ARGS_MOCK,
          remoteTransactionSource: createRemoteTransactionSourceMock([]),
          getLocalTransactions: () => [TRANSACTION_MOCK],
        });

        const { blockNumberListener } = await emitBlockTrackerLatestEvent(
          helper,
        );

        expect(blockNumberListener).not.toHaveBeenCalled();
      });

      it('does not if no block number on fetched transaction', async () => {
        const helper = new IncomingTransactionHelper({
          ...CONTROLLER_ARGS_MOCK,
          remoteTransactionSource: createRemoteTransactionSourceMock([
            { ...TRANSACTION_MOCK_2, blockNumber: undefined },
          ]),
          getLocalTransactions: () => [TRANSACTION_MOCK],
        });

        const { blockNumberListener } = await emitBlockTrackerLatestEvent(
          helper,
        );

        expect(blockNumberListener).not.toHaveBeenCalled();
      });

      it('does not if fetch transaction not to current account', async () => {
        const helper = new IncomingTransactionHelper({
          ...CONTROLLER_ARGS_MOCK,
          remoteTransactionSource: createRemoteTransactionSourceMock([
            {
              ...TRANSACTION_MOCK_2,
              txParams: { to: '0x2' },
            } as TransactionMeta,
          ]),
          getLocalTransactions: () => [TRANSACTION_MOCK],
        });

        const { blockNumberListener } = await emitBlockTrackerLatestEvent(
          helper,
        );

        expect(blockNumberListener).not.toHaveBeenCalled();
      });

      it('does not if fetched transaction has same block number', async () => {
        const helper = new IncomingTransactionHelper({
          ...CONTROLLER_ARGS_MOCK,
          remoteTransactionSource: createRemoteTransactionSourceMock([
            TRANSACTION_MOCK_2,
          ]),
          getLocalTransactions: () => [TRANSACTION_MOCK],
          lastFetchedBlockNumbers: {
            [`${NETWORK_STATE_MOCK.providerConfig.chainId}#${ADDERSS_MOCK}`]:
              parseInt(TRANSACTION_MOCK_2.blockNumber as string, 10),
          },
        });

        const { blockNumberListener } = await emitBlockTrackerLatestEvent(
          helper,
        );

        expect(blockNumberListener).not.toHaveBeenCalled();
      });
    });
  });

  describe('start', () => {
    it('adds listener to block tracker', async () => {
      const helper = new IncomingTransactionHelper({
        ...CONTROLLER_ARGS_MOCK,
        remoteTransactionSource: createRemoteTransactionSourceMock([]),
      });

      helper.start();

      expect(
        CONTROLLER_ARGS_MOCK.blockTracker.addListener,
      ).toHaveBeenCalledTimes(1);
    });

    it('does nothing if already started', async () => {
      const helper = new IncomingTransactionHelper({
        ...CONTROLLER_ARGS_MOCK,
        remoteTransactionSource: createRemoteTransactionSourceMock([]),
      });

      helper.start();
      helper.start();

      expect(
        CONTROLLER_ARGS_MOCK.blockTracker.addListener,
      ).toHaveBeenCalledTimes(1);
    });

    it('does nothing if disabled', async () => {
      const helper = new IncomingTransactionHelper({
        ...CONTROLLER_ARGS_MOCK,
        isEnabled: () => false,
        remoteTransactionSource: createRemoteTransactionSourceMock([]),
      });

      helper.start();

      expect(
        CONTROLLER_ARGS_MOCK.blockTracker.addListener,
      ).not.toHaveBeenCalled();
    });

    it('does nothing if network not supported by remote transaction source', async () => {
      const helper = new IncomingTransactionHelper({
        ...CONTROLLER_ARGS_MOCK,
        remoteTransactionSource: createRemoteTransactionSourceMock([], {
          isSupportedNetwork: false,
        }),
      });

      helper.start();

      expect(
        CONTROLLER_ARGS_MOCK.blockTracker.addListener,
      ).not.toHaveBeenCalled();
    });
  });

  describe('stop', () => {
    it('removes listener from block tracker', async () => {
      const helper = new IncomingTransactionHelper({
        ...CONTROLLER_ARGS_MOCK,
        remoteTransactionSource: createRemoteTransactionSourceMock([]),
      });

      helper.start();
      helper.stop();

      expect(
        CONTROLLER_ARGS_MOCK.blockTracker.removeListener,
      ).toHaveBeenCalledTimes(1);
    });
  });
});