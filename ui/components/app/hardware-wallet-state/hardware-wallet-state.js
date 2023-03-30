import React, { useCallback, useContext, useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import PropTypes from 'prop-types';
import {
  getHardwareWalletDevice,
  getHardwareWalletPath,
} from '../../../selectors';
import { isDeviceAccessible } from '../../../store/actions';
import { I18nContext } from '../../../contexts/i18n';
import { setHardwareWalletState } from '../../../ducks/app/app';
import { HARDWARE_CHECK_RATE } from '../../../../shared/constants/hardware-wallets';
import { SEVERITIES } from '../../../helpers/constants/design-system';
import { BannerAlert } from '../../component-library';

/**
 * Default renedered component for HardwareWalletState
 *
 * @param options0
 * @param options0.severity
 * @param options0.children
 */
const DefaultComponent = ({
  severity = SEVERITIES.DANGER,
  children,
  ...props
}) => (
  <BannerAlert severity={severity} {...props}>
    {children}
  </BannerAlert>
);

DefaultComponent.propTypes = {
  // BannerAlert severity/color
  severity: PropTypes.string,
  // child nodes to render inside default component
  children: PropTypes.node,
};

/**
 * Component that monitors hardware wallet state and displays a warning if locked
 *
 * @param options0
 * @param options0.pollingRateMs
 * @param options0.initialStatus
 * @param options0.onUpdate
 * @param options0.Component
 */
export default function HardwareWalletState({
  pollingRateMs = HARDWARE_CHECK_RATE,
  initialStatus = 'locked',
  onUpdate,
  Component = DefaultComponent,
  ...props
}) {
  const t = useContext(I18nContext);
  const dispatch = useDispatch();

  const [status, setStatus] = useState(initialStatus);
  const device = useSelector(getHardwareWalletDevice);
  const path = useSelector(getHardwareWalletPath);

  const updateHardwareLockState = useCallback(async () => {
    const unlocked = await isDeviceAccessible(device, path);
    const state = unlocked ? 'unlocked' : 'locked';
    const changed = state !== status;
    setStatus(state);
    onUpdate?.(state);
    // issue dispatch on change
    if (changed) {
      dispatch(setHardwareWalletState(state));
    }
  }, [device, path, onUpdate]);

  useEffect(() => {
    const intervalId = setInterval(updateHardwareLockState, pollingRateMs);
    return () => clearInterval(intervalId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pollingRateMs]);

  return (
    status === 'locked' && <Component {...props}>{t('ledgerLocked')}</Component>
  );
}

HardwareWalletState.propTypes = {
  // number of milliseconds between polling checks
  pollingRateMs: PropTypes.number,
  // initial status prior to first polling (locked/unlocked)
  initialStatus: PropTypes.string,
  // invoked with each updated status (locked/unlocked)
  onUpdate: PropTypes.func,
  // component to be rendered (default: BannerAlert)
  Component: PropTypes.func,
};
