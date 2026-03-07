// services/BroadcastState.js

/**
 * This module provides a shared, in-memory state for the currently advertised card.
 * It is used to communicate between the BluetoothService (which sets the advertisement)
 * and the PeripheralService (which responds to connection requests) without creating
 * circular dependencies.
 */

let advertisedCard = null;

export const getAdvertisedCard = () => {
  return advertisedCard;
};

export const setAdvertisedCard = (card) => {
  advertisedCard = card;
};

export const clearAdvertisedCard = () => {
  advertisedCard = null;
};
