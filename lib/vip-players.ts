// Hardcoded VIP Players data (temporary until database is ready)
export interface VIPPlayer {
  vipId: string;
  memberName: string;
  memberLogin: string;
}

export const assignedVIPPlayers: VIPPlayer[] = [
  { vipId: "1", memberName: "John Anderson", memberLogin: "john.anderson" },
  { vipId: "2", memberName: "Maria Rodriguez", memberLogin: "maria.rodriguez" },
  { vipId: "3", memberName: "David Kim", memberLogin: "david.kim" },
  { vipId: "4", memberName: "Lisa Wang", memberLogin: "lisa.wang" },
  { vipId: "5", memberName: "Robert Brown", memberLogin: "robert.brown" },
  { vipId: "6", memberName: "Emma Davis", memberLogin: "emma.davis" },
];

// Utility functions for VIP player operations
export const getVIPPlayerById = (vipId: string): VIPPlayer | undefined => {
  return assignedVIPPlayers.find(player => player.vipId === vipId);
};

export const getVIPPlayerByLogin = (memberLogin: string): VIPPlayer | undefined => {
  return assignedVIPPlayers.find(player => player.memberLogin === memberLogin);
};

export const getAllVIPPlayers = (): VIPPlayer[] => {
  return assignedVIPPlayers;
};
