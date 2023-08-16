import React from 'react';
import PropTypes from 'prop-types';

import { useHistory } from 'react-router-dom';

import { useI18nContext } from '../../../../hooks/useI18nContext';
import { SNAPS_VIEW_ROUTE } from '../../../../helpers/constants/routes';
import {
  TextVariant,
  JustifyContent,
  AlignItems,
  TextColor,
  Size,
  IconColor,
  Display,
} from '../../../../helpers/constants/design-system';
import {
  ButtonSize,
  ButtonVariant,
  Box,
  Button,
  Icon,
  IconName,
  Text,
} from '../../../component-library';

export default function SnapContentFooter({ snapName, snapId }) {
  const t = useI18nContext();
  const history = useHistory();

  const handleNameClick = (e) => {
    e.stopPropagation();
    history.push(`${SNAPS_VIEW_ROUTE}/${encodeURIComponent(snapId)}`);
  };

  return (
    <Box
      display={Display.Flex}
      justifyContent={JustifyContent.center}
      alignItems={AlignItems.center}
      paddingTop={4}
      paddingBottom={4}
      className="snap-content-footer"
    >
      <Icon
        name={IconName.Warning}
        size={Size.SM}
        color={IconColor.iconMuted}
        marginRight={1}
      />
      <Text
        color={TextColor.textMuted}
        variant={TextVariant.bodyXs}
        className="snap-content-footer__description"
      >
        {t('snapContent', [
          <Button
            variant={ButtonVariant.Link}
            size={ButtonSize.Inherit}
            onClick={handleNameClick}
            key="button"
            ellipsis
          >
            {snapName}
          </Button>,
        ])}
      </Text>
    </Box>
  );
}

SnapContentFooter.propTypes = {
  /**
   * The name of the snap who's content is displayed
   */
  snapName: PropTypes.string,
  /**
   * The id of the snap
   */
  snapId: PropTypes.string,
};
