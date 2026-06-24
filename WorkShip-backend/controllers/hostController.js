const Booking = require("../models/Booking");
const Workspace = require("../models/Workspace");

function startOfDay(date) {
  const nextDate = new Date(date);
  nextDate.setHours(0, 0, 0, 0);
  return nextDate;
}

function formatDayLabel(date) {
  return date.toLocaleDateString("en-US", { weekday: "short" });
}

exports.getHostStats = async (req, res) => {
  try {
    if (!req.user.isHost) {
      return res.status(403).json({ message: "Host access required" });
    }

    const hostId = req.user.userId;
    const listings = await Workspace.find({ host: hostId })
      .sort({ createdAt: -1 })
      .lean();
    const workspaceIds = listings.map((workspace) => workspace._id);

    if (workspaceIds.length === 0) {
      const today = startOfDay(new Date());
      const earningsLast7Days = Array.from({ length: 7 }, (_, index) => {
        const date = new Date(today);
        date.setDate(today.getDate() - (6 - index));
        return {
          date: date.toISOString(),
          label: formatDayLabel(date),
          earnings: 0,
        };
      });

      return res.status(200).json({
        totalListings: 0,
        totalBookings: 0,
        totalGuests: 0,
        averageRating: 0,
        totalEarnings: 0,
        earningsLast7Days,
        listings: [],
      });
    }

    const bookingFilter = {
      workspace: { $in: workspaceIds },
      status: { $ne: "cancelled" },
    };
    const earningsFilter = {
      workspace: { $in: workspaceIds },
      status: "confirmed",
    };

    const [totalBookings, guestIds, earningsStats] = await Promise.all([
      Booking.countDocuments(bookingFilter),
      Booking.distinct("user", bookingFilter),
      Booking.aggregate([
        { $match: earningsFilter },
        { $group: { _id: null, totalEarnings: { $sum: "$totalPrice" } } },
      ]),
    ]);

    const totalReviews = listings.reduce((sum, workspace) => sum + (workspace.numReviews || 0), 0);
    const ratingTotal = listings.reduce(
      (sum, workspace) => sum + (workspace.rating || 0) * (workspace.numReviews || 0),
      0,
    );
    const averageRating = totalReviews > 0 ? Number((ratingTotal / totalReviews).toFixed(2)) : 0;
    const totalEarnings = earningsStats[0]?.totalEarnings || 0;

    const today = startOfDay(new Date());
    const firstGraphDay = new Date(today);
    firstGraphDay.setDate(today.getDate() - 6);

    const earningsByDay = await Booking.aggregate([
      {
        $match: {
          ...earningsFilter,
          createdAt: { $gte: firstGraphDay },
        },
      },
      {
        $group: {
          _id: {
            year: { $year: "$createdAt" },
            month: { $month: "$createdAt" },
            day: { $dayOfMonth: "$createdAt" },
          },
          earnings: { $sum: "$totalPrice" },
        },
      },
    ]);

    const earningsMap = new Map(
      earningsByDay.map((item) => [
        `${item._id.year}-${item._id.month}-${item._id.day}`,
        item.earnings,
      ]),
    );
    const earningsLast7Days = Array.from({ length: 7 }, (_, index) => {
      const date = new Date(firstGraphDay);
      date.setDate(firstGraphDay.getDate() + index);
      const key = `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;

      return {
        date: date.toISOString(),
        label: formatDayLabel(date),
        earnings: earningsMap.get(key) || 0,
      };
    });

    res.status(200).json({
      totalListings: listings.length,
      totalBookings,
      totalGuests: guestIds.length,
      averageRating,
      totalEarnings,
      earningsLast7Days,
      listings,
    });
  } catch (error) {
    console.error("Get host stats error:", error);
    res.status(500).json({ message: "Server error" });
  }
};
