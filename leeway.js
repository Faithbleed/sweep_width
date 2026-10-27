// Leeway coefficients from OpenDrift OBJECTPROP.DAT (Allen & Plourde 1999; Allen 2005, US Coast Guard R&D Center).
// dw / cwr / cwl = [slope % of 10 m wind, offset cm/s, std error cm/s] for downwind, crosswind-right, crosswind-left.
export const LEEWAY = [
 {
  "group": "Person in water",
  "items": [
   {
    "id": "PIW-1",
    "name": "Person in water, unknown state",
    "src": "Person-in-water (PIW), unknown state (mean values)",
    "dw": [
     0.96,
     0.0,
     12.0
    ],
    "cwr": [
     0.54,
     0.0,
     9.4
    ],
    "cwl": [
     -0.54,
     0.0,
     9.4
    ]
   },
   {
    "id": "PIW-2",
    "name": "PIW, vertical, lifejacket",
    "src": "PIW, vertical PFD type III conscious",
    "dw": [
     0.48,
     0.0,
     8.3
    ],
    "cwr": [
     0.15,
     0.0,
     6.7
    ],
    "cwl": [
     -0.15,
     0.0,
     6.7
    ]
   },
   {
    "id": "PIW-3",
    "name": "PIW, sitting, lifejacket",
    "src": "PIW, sitting, PFD type I or II",
    "dw": [
     1.6,
     -3.98,
     2.42
    ],
    "cwr": [
     0.13,
     0.33,
     2.11
    ],
    "cwl": [
     -0.13,
     -0.33,
     2.11
    ]
   },
   {
    "id": "PIW-4",
    "name": "PIW, survival suit",
    "src": "PIW, survival suit (face up)",
    "dw": [
     1.71,
     1.12,
     3.93
    ],
    "cwr": [
     1.36,
     -3.3,
     1.71
    ],
    "cwl": [
     -0.13,
     -2.65,
     1.62
    ]
   },
   {
    "id": "PIW-6",
    "name": "PIW, deceased (face down)",
    "src": "PIW, deceased (face down)",
    "dw": [
     1.117,
     10.2,
     3.04
    ],
    "cwr": [
     0.04,
     3.9,
     4.05
    ],
    "cwl": [
     -0.04,
     -3.9,
     4.05
    ]
   }
  ]
 },
 {
  "group": "Life raft",
  "items": [
   {
    "id": "LIFE-RAFT-DB-10",
    "name": "Life raft, deep ballast, unknown",
    "src": "Life raft, deep ballast (DB) system, general, unknown capacity and loading (mean values)",
    "dw": [
     3.52,
     -2.5,
     6.1
    ],
    "cwr": [
     0.62,
     -3.0,
     3.5
    ],
    "cwl": [
     -0.45,
     -0.2,
     3.6
    ]
   },
   {
    "id": "LIFE-RAFT-DB-12",
    "name": "Life raft 4–14 p, deep ballast, no drogue",
    "src": "4-14 person capacity, deep ballast system, no drogue",
    "dw": [
     3.75,
     -2.3,
     4.4
    ],
    "cwr": [
     0.78,
     -3.6,
     3.6
    ],
    "cwl": [
     -0.47,
     -0.1,
     3.9
    ]
   },
   {
    "id": "LIFE-RAFT-DB-15",
    "name": "Life raft 4–14 p, deep ballast, drogue",
    "src": "4-14 person capacity, deep ballast system, canopy, with drogue (average)",
    "dw": [
     1.91,
     0.9,
     1.6
    ],
    "cwr": [
     0.78,
     -3.6,
     3.6
    ],
    "cwl": [
     -0.47,
     -0.1,
     3.9
    ]
   },
   {
    "id": "LIFE-RAFT-DB-18",
    "name": "Life raft 15–50 p, deep ballast",
    "src": "15-50 person capacity, deep ballast system, canopy, general (mean values)",
    "dw": [
     3.68,
     -4.96,
     5.37
    ],
    "cwr": [
     0.34,
     -1.85,
     2.5
    ],
    "cwl": [
     -0.49,
     1.58,
     2.63
    ]
   },
   {
    "id": "LIFE-RAFT-SB-6",
    "name": "Life raft, shallow ballast, canopy",
    "src": "Life-raft, shallow ballast (SB) system AND canopy, general (mean values)",
    "dw": [
     2.68,
     0.0,
     12.0
    ],
    "cwr": [
     1.1,
     0.0,
     9.4
    ],
    "cwl": [
     -1.1,
     0.0,
     9.4
    ]
   },
   {
    "id": "LIFE-RAFT-NB-1",
    "name": "Life raft, no ballast",
    "src": "Life-raft, no ballast (NB) system, general (mean values)",
    "dw": [
     3.7,
     0.0,
     12.0
    ],
    "cwr": [
     1.98,
     0.0,
     9.4
    ],
    "cwl": [
     -1.98,
     0.0,
     9.4
    ]
   },
   {
    "id": "AVIATION-1",
    "name": "Aviation raft 4–6 p, no drogue",
    "src": "Life-raft, 4-6 person capacity, no ballast, with canopy, no drogue",
    "dw": [
     3.39,
     0.0,
     2.4
    ],
    "cwr": [
     1.49,
     0.0,
     2.4
    ],
    "cwl": [
     -1.49,
     0.0,
     2.4
    ]
   },
   {
    "id": "LIFE-RAFT-DB-21",
    "name": "Life raft, capsized",
    "src": "Deep ballast system, general (mean values), capsized",
    "dw": [
     0.88,
     0.0,
     2.5
    ],
    "cwr": [
     0.18,
     0.0,
     2.4
    ],
    "cwl": [
     -0.18,
     0.0,
     2.4
    ]
   },
   {
    "id": "LIFE-RAFT-DB-22",
    "name": "Life raft, swamped",
    "src": "Deep ballast system, general (mean values), swamped",
    "dw": [
     0.99,
     0.0,
     2.4
    ],
    "cwr": [
     0.14,
     0.0,
     2.3
    ],
    "cwl": [
     -0.14,
     0.0,
     2.3
    ]
   }
  ]
 },
 {
  "group": "Small craft",
  "items": [
   {
    "id": "PERSON-POWERED-VESSEL-1",
    "name": "Kayak, person on deck",
    "src": "Sea Kayak with person on aft deck",
    "dw": [
     1.16,
     11.12,
     4.12
    ],
    "cwr": [
     0.41,
     0.0,
     4.39
    ],
    "cwl": [
     -0.41,
     0.0,
     4.39
    ]
   },
   {
    "id": "PERSON-POWERED-VESSEL-2",
    "name": "Surfboard with person",
    "src": "Surf board with person",
    "dw": [
     1.93,
     0.0,
     8.3
    ],
    "cwr": [
     0.51,
     0.0,
     6.7
    ],
    "cwl": [
     -0.51,
     0.0,
     6.7
    ]
   },
   {
    "id": "PERSON-POWERED-VESSEL-3",
    "name": "Windsurfer, sail in water",
    "src": "Windsurfer with mast and sail in water",
    "dw": [
     2.25,
     5.03,
     2.5
    ],
    "cwr": [
     0.69,
     -1.3,
     2.96
    ],
    "cwl": [
     -0.69,
     1.3,
     2.96
    ]
   },
   {
    "id": "SKIFF-1",
    "name": "Runabout / outboard powerboat",
    "src": "Skiff - modified-v, cathedral-hull, runabout outboard powerboat",
    "dw": [
     3.15,
     0.0,
     2.2
    ],
    "cwr": [
     1.29,
     0.0,
     2.2
    ],
    "cwl": [
     -1.29,
     0.0,
     2.2
    ]
   },
   {
    "id": "SKIFF-2",
    "name": "Skiff, V-hull",
    "src": "Skiff, V-hull",
    "dw": [
     2.87,
     3.98,
     3.33
    ],
    "cwr": [
     0.32,
     -2.93,
     2.53
    ],
    "cwl": [
     -0.62,
     1.03,
     3.05
    ]
   },
   {
    "id": "SKIFF-3",
    "name": "Skiff, swamped or capsized",
    "src": "Skiffs, swamped and capsized",
    "dw": [
     1.65,
     0.0,
     3.1
    ],
    "cwr": [
     0.39,
     0.0,
     2.9
    ],
    "cwl": [
     -0.39,
     0.0,
     2.9
    ]
   },
   {
    "id": "SPORT-BOAT",
    "name": "Sport boat, cuddy cabin",
    "src": "Sport boat, no canvas (*1), modified V-hull",
    "dw": [
     6.54,
     0.0,
     3.0
    ],
    "cwr": [
     2.19,
     0.0,
     2.8
    ],
    "cwl": [
     -2.19,
     0.0,
     2.8
    ]
   },
   {
    "id": "SPORT-FISHER",
    "name": "Sport fisher, centre console",
    "src": "Sport fisher, center console (*2), open cockpit",
    "dw": [
     5.55,
     0.0,
     3.3
    ],
    "cwr": [
     2.27,
     0.0,
     3.0
    ],
    "cwl": [
     -2.27,
     0.0,
     3.0
    ]
   }
  ]
 },
 {
  "group": "Yachts and vessels",
  "items": [
   {
    "id": "SAILBOAT-1",
    "name": "Yacht, monohull (average)",
    "src": "Sailboat Mono-hull (Average)",
    "dw": [
     4.5,
     0.0,
     19.4
    ],
    "cwr": [
     4.95,
     0.0,
     18.42
    ],
    "cwl": [
     -2.82,
     0.0,
     24.95
    ]
   },
   {
    "id": "SAILBOAT-2",
    "name": "Yacht, dismasted",
    "src": "Sailboat Mono-hull (Dismasted, Average)",
    "dw": [
     3.94,
     0.0,
     19.62
    ],
    "cwr": [
     3.98,
     0.0,
     12.6788
    ],
    "cwl": [
     -0.79,
     0.0,
     2.13
    ]
   },
   {
    "id": "SAILBOAT-5",
    "name": "Yacht, bare-masted",
    "src": "Sailboat Mono-hull (Bare-masted,  Average)",
    "dw": [
     5.23,
     0.0,
     18.52
    ],
    "cwr": [
     5.89,
     0.0,
     18.87
    ],
    "cwl": [
     -6.09,
     0.0,
     18.58
    ]
   },
   {
    "id": "FISHING-VESSEL-1",
    "name": "Fishing vessel, general",
    "src": "Fishing vessel, general (mean values)",
    "dw": [
     2.47,
     0.0,
     12.0
    ],
    "cwr": [
     2.76,
     0.0,
     9.4
    ],
    "cwl": [
     -2.76,
     0.0,
     9.4
    ]
   },
   {
    "id": "COASTAL-FREIGHTER",
    "name": "Coastal freighter",
    "src": "Coastal freighter. (*5)",
    "dw": [
     1.87,
     0.0,
     8.3
    ],
    "cwr": [
     2.09,
     0.0,
     6.7
    ],
    "cwl": [
     -2.09,
     0.0,
     6.7
    ]
   },
   {
    "id": "FV-DEBRIS",
    "name": "Fishing vessel debris",
    "src": "Fishing vessel debris",
    "dw": [
     1.97,
     0.0,
     8.3
    ],
    "cwr": [
     0.36,
     0.0,
     6.7
    ],
    "cwl": [
     -0.36,
     0.0,
     6.7
    ]
   }
  ]
 },
 {
  "group": "Current only",
  "items": [
   {
    "id": "SLDMB",
    "name": "Datum marker buoy (no wind)",
    "src": "Self-locating datum marker buoy - no windage",
    "dw": [
     0.0,
     0.0,
     0.0
    ],
    "cwr": [
     0.0,
     0.0,
     0.0
    ],
    "cwl": [
     0.0,
     0.0,
     0.0
    ]
   }
  ]
 }
];
