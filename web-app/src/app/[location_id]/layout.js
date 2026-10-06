import ParkingHeader from "@/components/layout/header/ParkingHeader";
import styles from "@/components/pages/home/StatusView/StatusViewPage.module.css";

export default function LocationLayout({ children }) {
  return (
    <div className={styles.page}>
      <ParkingHeader />
      {children}
    </div>
  );
}
