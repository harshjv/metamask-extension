import React, { useContext } from 'react';
import PropTypes from 'prop-types';
import { I18nContext } from '../../../contexts/i18n';
import {
  TextVariant,
  AlignItems,
  Display,
  Severity,
  FlexDirection,
  BlockSize,
} from '../../../helpers/constants/design-system';

import {
  Text,
  Box,
  BannerAlert,
  Button,
  ButtonSize,
  ButtonVariant,
  Modal,
  ModalContent,
  ModalHeader,
  AvatarToken,
  AvatarTokenSize,
  FormTextField,
  ModalOverlay,
} from '../../../components/component-library';

export default function ImportToken({
  onImportTokenCloseClick,
  onImportTokenClick,
  setIsImportTokenModalOpen,
  tokenForImport,
  isOpen,
}) {
  const t = useContext(I18nContext);
  return (
    <Modal isOpen={isOpen} onClose={() => setIsImportTokenModalOpen(false)}>
      <ModalOverlay />
      <ModalContent
        modalDialogProps={{
          display: Display.Flex,
          flexDirection: FlexDirection.Column,
          alignItems: AlignItems.center,
          gap: 4,
        }}
      >
        <ModalHeader
          onClose={() => setIsImportTokenModalOpen(false)}
          width={BlockSize.Full}
        >
          {t('importTokenQuestion')}
        </ModalHeader>
        <BannerAlert
          severity={Severity.Danger}
          description={t('importTokenWarning')}
        />
        <AvatarToken
          src={tokenForImport.iconUrl}
          name={tokenForImport.symbol}
          size={AvatarTokenSize.Xl}
        />
        <Text variant={TextVariant.headingSm} as="h4">
          {tokenForImport.name || ''}
        </Text>
        <FormTextField
          label={t('contract')}
          id="import-tokens-input"
          inputProps={{ variant: TextVariant.bodySm }}
          readOnly
          value={tokenForImport.address || ''}
          width={BlockSize.Full}
        />
        <Box
          display={Display.Flex}
          flexDirection={FlexDirection.Row}
          gap={4}
          width={BlockSize.Full}
        >
          <Button
            variant={ButtonVariant.Secondary}
            block
            size={ButtonSize.Lg}
            onClick={onImportTokenCloseClick}
          >
            {t('cancel')}
          </Button>
          <Button
            variant={ButtonVariant.Primary}
            block
            size={ButtonSize.Lg}
            onClick={onImportTokenClick}
            data-testid="import-tokens-import-button"
          >
            {t('import')}
          </Button>
        </Box>
      </ModalContent>
    </Modal>
  );
}

ImportToken.propTypes = {
  onImportTokenCloseClick: PropTypes.func,
  onImportTokenClick: PropTypes.func,
  setIsImportTokenModalOpen: PropTypes.func,
  tokenForImport: PropTypes.object,
  isOpen: PropTypes.bool,
};
