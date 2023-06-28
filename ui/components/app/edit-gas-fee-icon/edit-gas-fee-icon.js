import React from 'react';
import PropTypes from 'prop-types';

import { useGasFeeContext } from '../../../contexts/gasFee';
import { useTransactionEventFragment } from '../../../hooks/useTransactionEventFragment';
import { useTransactionModalContext } from '../../../contexts/transaction-modal';
import { ButtonIcon, ButtonIconSize, IconName } from '../../component-library';

export default function EditGasFeeIcon({ userAcknowledgedGasMissing }) {
  const { hasSimulationError, estimateUsed, supportsEIP1559 } =
    useGasFeeContext();
  const { updateTransactionEventFragment } = useTransactionEventFragment();
  const { openModal } = useTransactionModalContext();
  const editEnabled =
    !hasSimulationError || userAcknowledgedGasMissing === true;

  if (!supportsEIP1559 || !estimateUsed || !editEnabled) {
    return null;
  }

  const openEditGasFeeModal = () => {
    updateTransactionEventFragment({
      gas_edit_attempted: 'basic',
    });
    openModal('editGasFee');
  };

  return (
    <ButtonIcon
      ariaLabel="edit"
      iconName={IconName.Edit}
      size={ButtonIconSize.Sm}
      onClick={openEditGasFeeModal}
      data-testid="edit-gas-fee-icon"
    />
  );
}

EditGasFeeIcon.propTypes = {
  userAcknowledgedGasMissing: PropTypes.bool,
};
