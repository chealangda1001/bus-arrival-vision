import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import DepartureBoard from "@/components/DepartureBoard";
import AnnouncementSystem from "@/components/AnnouncementSystem";
import { useBranches } from "@/hooks/useBranches";
import { type Departure } from "@/hooks/useDepartures";
import { TranslationProvider, useTranslation } from "@/hooks/useTranslation";

const BranchBoardContent = () => {
  const { operatorSlug, branchSlug } = useParams();
  const { getBranchBySlug } = useBranches();
  const { t } = useTranslation();
  const [currentTime, setCurrentTime] = useState("");
  const [currentAnnouncement, setCurrentAnnouncement] = useState<{ departure: Departure } | null>(null);

  const branch = getBranchBySlug(operatorSlug!, branchSlug!);

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(now.toLocaleTimeString('en-US', {
        hour12: false,
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      }));
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleAnnouncement = (departure: Departure) => {
    setCurrentAnnouncement({ departure });
  };

  const handleAnnouncementComplete = () => {
    setCurrentAnnouncement(null);
  };

  if (!branch) {
    return <div className="min-h-screen bg-dashboard p-6 flex items-center justify-center">
      <div className="text-text-display text-xl">{t('branch_not_found')}</div>
    </div>;
  }

  return (
    <div className="min-h-screen bg-dashboard p-6">
      <div className="max-w-7xl mx-auto">
        {currentAnnouncement && (
          <div className="mb-6">
            <AnnouncementSystem
              departure={currentAnnouncement.departure}
              operatorId={branch.operator_id}
              onComplete={handleAnnouncementComplete}
            />
          </div>
        )}
        <DepartureBoard
          currentTime={currentTime}
          branchId={branch.id}
          onAnnouncement={handleAnnouncement}
        />
      </div>
    </div>
  );
};

const BranchBoard = () => {
  return (
    <TranslationProvider>
      <BranchBoardContent />
    </TranslationProvider>
  );
};

export default BranchBoard;