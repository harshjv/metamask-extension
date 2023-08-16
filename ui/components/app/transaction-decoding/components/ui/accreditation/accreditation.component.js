import React, { useContext } from 'react';
import { useSelector } from 'react-redux';
import PropTypes from 'prop-types';
import { getAccountLink } from '@metamask/etherscan-link';
import {
  getCurrentChainId,
  getRpcPrefsForCurrentProvider,
} from '../../../../../../selectors';
import { I18nContext } from '../../../../../../contexts/i18n';

import {
  Button,
  ButtonSize,
  ButtonVariant,
  Icon,
  IconName,
  Text,
  Box,
} from '../../../../../component-library';
import {
  AlignItems,
  Display,
  TextVariant,
  FlexDirection,
  FlexWrap,
} from '../../../../../../helpers/constants/design-system';

const Accreditation = ({ fetchVia, address }) => {
  const t = useContext(I18nContext);
  const chainId = useSelector(getCurrentChainId);
  const rpcPrefs = useSelector(getRpcPrefsForCurrentProvider);
  const addressLink = getAccountLink(address, chainId, rpcPrefs);

  return (
    <Box
      className="accreditation"
      marginTop={2}
      alignItems={AlignItems.center}
      display={Display.Flex}
    >
      <Icon name={IconName.Info} marginRight={2} />
      <Box
        display={Display.Flex}
        flexDirection={FlexDirection.Column}
        flexWrap={FlexWrap.Wrap}
      >
        <Text variant={TextVariant.bodySm}>
          {t('transactionDecodingAccreditationVerified', [
            <Button
              variant={ButtonVariant.Link}
              href={addressLink}
              externalLink
              key="accreditation-link-button"
              size={ButtonSize.Inherit}
            >
              {fetchVia}
            </Button>,
          ])}
        </Text>
        <Text variant={TextVariant.bodySm}>
          {t('transactionDecodingAccreditationDecoded')}
        </Text>
      </Box>
    </Box>
  );
};

Accreditation.propTypes = {
  fetchVia: PropTypes.string.isRequired,
  address: PropTypes.string.isRequired,
};

export default Accreditation;
